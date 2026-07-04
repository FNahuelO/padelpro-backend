import { BadRequestException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { ClubPointsService } from '../clubs/club-points.service';
import { CompetitiveScoringService } from '../competitive-scoring/competitive-scoring.service';
import { BadgesService } from '../badges/badges.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { defaultLevelBand } from '../common/utils/level-range.util';
import { CreateMatchDto } from './dto/create-match.dto';
import { MatchInviteDto } from './dto/match-invite.dto';
import { CreateMatchResultDto } from './dto/create-match-result.dto';
import { ConfirmMatchResultDto } from './dto/confirm-match-result.dto';
import { RejectMatchResultDto } from './dto/reject-match-result.dto';
import { PlayerRatingDto } from './dto/player-rating.dto';
import { UpdateMatchStatusDto } from './dto/update-match-status.dto';
import { MatchesRepository } from './matches.repository';
import { PaymentsService } from '../payments/payments.service';
import { resolvePlayerRating } from '../common/utils';
import { parseBestOfThreeSets } from '../common/utils/match-result.util';
import { computeMatchRatingChanges, splitParticipantsByTeam } from '../rating/engine';

@Injectable()
export class MatchesService {
  constructor(
    private readonly matchesRepository: MatchesRepository,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly clubPointsService: ClubPointsService,
    private readonly competitiveScoringService: CompetitiveScoringService,
    private readonly badgesService: BadgesService,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
  ) {}

  async expirePastCourtWindowMatches(): Promise<number> {
    await this.matchesRepository.expirePastCourtSlots();
    return this.matchesRepository.expirePastCourtWindowMatches();
  }

  private async refreshExpiredCourtWindows() {
    await this.expirePastCourtWindowMatches();
  }

  async create(userId: string, dto: CreateMatchDto) {
    if (dto.levelMin == null || dto.levelMax == null) {
      const level = await this.matchesRepository.getPlayerSkillScoreByUserId(userId);
      const band = defaultLevelBand(level ?? 400);
      dto.levelMin = dto.levelMin ?? band.min;
      dto.levelMax = dto.levelMax ?? band.max;
    }

    const result = await this.matchesRepository.create(userId, dto);
    const match = result.rows[0];

    const playerId = await this.matchesRepository.getPlayerIdByUserId(userId);
    if (playerId) {
      await this.matchesRepository.join(match.id, playerId, 'JOINED', 1);
    }

    await this.joinInvitedPlayers(match.id, userId, dto.invites);
    await this.syncMatchCapacityStatus(match.id);

    await this.matchesRepository.createMatchChatIfMissing(match.id);
    const detail = await this.matchesRepository.getDetail(match.id);
    this.realtimeGateway.emitMatchUpdated(detail);
    return detail;
  }

  async findOne(id: string, viewerUserId?: string) {
    await this.refreshExpiredCourtWindows();
    const match = await this.matchesRepository.getDetail(id);
    if (!match) {
      throw new NotFoundException('Partido no encontrado');
    }

    const joinRequests = await this.matchesRepository.listJoinRequests(id);
    let viewerJoinStatus: string | null = null;
    let joinRequiresApproval = false;

    if (viewerUserId) {
      const playerId = await this.matchesRepository.getPlayerIdByUserId(viewerUserId);
      if (playerId) {
        viewerJoinStatus = await this.matchesRepository.getPlayerMatchStatus(id, playerId);
      }
      joinRequiresApproval = !(await this.playerLevelFitsMatch(viewerUserId, match));
    }

    const payload = {
      ...match,
      join_requests: joinRequests,
      viewer_join_status: viewerJoinStatus,
      join_requires_approval: joinRequiresApproval,
    };

    if (viewerUserId) {
      const deposit = await this.paymentsService.getDepositStatusForUser(id, viewerUserId);
      return { ...payload, deposit };
    }
    return payload;
  }

  async findAll() {
    await this.refreshExpiredCourtWindows();
    return this.matchesRepository.listOpen();
  }

  async getMyMatches(userId: string) {
    await this.refreshExpiredCourtWindows();
    return this.matchesRepository.listByUser(userId);
  }

  private async playerLevelFitsMatch(
    userId: string,
    match: { level_min?: number | null; level_max?: number | null },
  ): Promise<boolean> {
    const level = await this.matchesRepository.getPlayerSkillScoreByUserId(userId);
    if (level == null) return true;

    const min = match.level_min != null ? Number(match.level_min) : null;
    const max = match.level_max != null ? Number(match.level_max) : null;
    if (min == null && max == null) return true;
    if (min != null && level < min) return false;
    if (max != null && level > max) return false;
    return true;
  }

  private async assertCanManageJoinRequests(matchId: string, approverUserId: string) {
    const match = await this.matchesRepository.getById(matchId);
    if (!match) {
      throw new NotFoundException('Partido no encontrado');
    }

    if (match.created_by_user_id === approverUserId) {
      return match;
    }

    const detail = await this.matchesRepository.getDetail(matchId);
    const isParticipant = detail?.players.some((player: { id: string }) => player.id === approverUserId);
    if (!isParticipant) {
      throw new BadRequestException('Solo el organizador o jugadores del partido pueden gestionar solicitudes');
    }

    return match;
  }

  async resolveInvites(creatorUserId: string, invites?: MatchInviteDto[]) {
    if (!invites?.length) {
      return {
        playerInvites: [] as Array<{ playerId: string; slotOrder: number }>,
        guestInvites: [] as Array<{ name: string; role: 'partner' | 'opponent'; slotOrder: number }>,
        invitedUserIds: [] as string[],
      };
    }

    const partners = invites.filter((i) => i.role === 'partner');
    const opponents = invites.filter((i) => i.role === 'opponent');

    if (partners.length > 1) {
      throw new BadRequestException('Solo podés invitar un compañero');
    }
    if (opponents.length > 2) {
      throw new BadRequestException('Solo podés invitar dos rivales');
    }

    const invitedUserIds = invites.map((i) => i.userId).filter((value): value is string => !!value);
    if (new Set(invitedUserIds).size !== invitedUserIds.length) {
      throw new BadRequestException('No podés invitar al mismo jugador más de una vez');
    }
    if (invitedUserIds.includes(creatorUserId)) {
      throw new BadRequestException('No podés invitarte a vos mismo');
    }

    const playerInvites: Array<{ playerId: string; slotOrder: number }> = [];
    const guestInvites: Array<{ name: string; role: 'partner' | 'opponent'; slotOrder: number }> = [];

    const resolveSlotOrder = (role: 'partner' | 'opponent', opponentIndex = 0) =>
      role === 'partner' ? 2 : 3 + opponentIndex;

    const pushInvite = async (invite: MatchInviteDto, slotOrder: number) => {
      if (invite.userId) {
        const invitedPlayerId = await this.matchesRepository.getPlayerIdByUserId(invite.userId);
        if (!invitedPlayerId) {
          throw new BadRequestException('Uno de los jugadores invitados no tiene perfil de jugador');
        }
        playerInvites.push({ playerId: invitedPlayerId, slotOrder });
        return;
      }
      if (invite.guestName?.trim()) {
        guestInvites.push({
          name: invite.guestName.trim(),
          role: invite.role,
          slotOrder,
        });
        return;
      }
      throw new BadRequestException('Cada invitación debe tener un jugador o un invitado externo');
    };

    if (partners[0]) {
      await pushInvite(partners[0], resolveSlotOrder('partner'));
    }
    for (const [index, opponent] of opponents.entries()) {
      await pushInvite(opponent, resolveSlotOrder('opponent', index));
    }

    return { playerInvites, guestInvites, invitedUserIds };
  }

  async joinInvitedPlayers(matchId: string, creatorUserId: string, invites?: MatchInviteDto[]) {
    const { playerInvites, guestInvites } = await this.resolveInvites(creatorUserId, invites);
    for (const invite of playerInvites) {
      await this.matchesRepository.join(matchId, invite.playerId, 'JOINED', invite.slotOrder);
    }
    for (const guest of guestInvites) {
      await this.matchesRepository.addGuestInvite({
        matchId,
        name: guest.name,
        role: guest.role,
        slotOrder: guest.slotOrder,
        invitedByUserId: creatorUserId,
        sponsorUserId: creatorUserId,
      });
    }
  }

  private async nextAvailableSlotOrder(matchId: string) {
    const slotOrder = await this.matchesRepository.getNextAvailableSlotOrder(matchId);
    if (slotOrder == null) {
      throw new BadRequestException('El partido ya no tiene cupos disponibles');
    }
    return slotOrder;
  }

  private async joinPlayerWithNextSlot(
    matchId: string,
    playerId: string,
    status: 'JOINED' | 'CONFIRMED' = 'JOINED',
  ) {
    const slotOrder = await this.nextAvailableSlotOrder(matchId);
    await this.matchesRepository.join(matchId, playerId, status, slotOrder);
  }

  private async requestJoin(matchId: string, playerId: string) {
    const existing = await this.matchesRepository.getPlayerMatchStatus(matchId, playerId);
    if (existing === 'REQUESTED') {
      throw new BadRequestException('Ya enviaste una solicitud para este partido');
    }
    if (existing === 'JOINED' || existing === 'CONFIRMED') {
      throw new BadRequestException('Ya participás de este partido');
    }

    await this.matchesRepository.join(matchId, playerId, 'REQUESTED', null);
  }

  private async syncMatchCapacityStatus(matchId: string) {
    const match = await this.matchesRepository.getById(matchId);
    if (!match) return;
    const joinedCount = await this.matchesRepository.countJoinedPlayers(matchId);
    if (joinedCount >= match.needed_players && match.status === 'OPEN') {
      await this.matchesRepository.updateStatus(matchId, 'FULL');
    }
  }

  async joinMatch(matchId: string, userId: string) {
    const match = await this.findOne(matchId);
    const playerId = await this.matchesRepository.getPlayerIdByUserId(userId);
    if (!playerId) {
      throw new BadRequestException('Debes completar perfil de jugador');
    }

    if (!['OPEN', 'FULL'].includes(match.status)) {
      throw new BadRequestException('Este partido ya no acepta jugadores');
    }

    const fitsLevel = await this.playerLevelFitsMatch(userId, match);
    const existingStatus = await this.matchesRepository.getPlayerMatchStatus(matchId, playerId);
    if (existingStatus === 'REQUESTED') {
      throw new BadRequestException('Ya enviaste una solicitud para este partido');
    }
    if (existingStatus === 'JOINED' || existingStatus === 'CONFIRMED') {
      throw new BadRequestException('Ya participás de este partido');
    }

    if (fitsLevel) {
      await this.joinPlayerWithNextSlot(matchId, playerId);
      await this.matchesRepository.createMatchChatIfMissing(matchId);

      const joinedCount = await this.matchesRepository.countJoinedPlayers(matchId);
      if (joinedCount >= match.needed_players && match.status === 'OPEN') {
        await this.matchesRepository.updateStatus(matchId, 'FULL');
      }
    } else {
      await this.requestJoin(matchId, playerId);
    }

    const updated = await this.findOne(matchId, userId);
    if (fitsLevel) {
      this.realtimeGateway.emitMatchJoined({ matchId, userId });
    }
    this.realtimeGateway.emitMatchUpdated(updated);
    return updated;
  }

  async acceptJoinRequest(matchId: string, requestUserId: string, approverUserId: string) {
    await this.assertCanManageJoinRequests(matchId, approverUserId);

    const match = await this.matchesRepository.getById(matchId);
    if (!match || !['OPEN', 'FULL'].includes(match.status)) {
      throw new BadRequestException('Este partido ya no acepta jugadores');
    }

    const requestPlayerId = await this.matchesRepository.getPlayerIdByUserId(requestUserId);
    if (!requestPlayerId) {
      throw new BadRequestException('Jugador no encontrado');
    }

    const requestStatus = await this.matchesRepository.getPlayerMatchStatus(matchId, requestPlayerId);
    if (requestStatus !== 'REQUESTED') {
      throw new BadRequestException('No hay una solicitud pendiente de este jugador');
    }

    const slotOrder = await this.nextAvailableSlotOrder(matchId);
    if (slotOrder == null) {
      throw new BadRequestException('El partido ya no tiene cupos disponibles');
    }

    await this.matchesRepository.join(matchId, requestPlayerId, 'JOINED', slotOrder);
    await this.matchesRepository.createMatchChatIfMissing(matchId);
    await this.syncMatchCapacityStatus(matchId);

    const updated = await this.findOne(matchId, approverUserId);
    this.realtimeGateway.emitMatchJoined({ matchId, userId: requestUserId });
    this.realtimeGateway.emitMatchUpdated(updated);
    return updated;
  }

  async rejectJoinRequest(matchId: string, requestUserId: string, approverUserId: string) {
    await this.assertCanManageJoinRequests(matchId, approverUserId);

    const requestPlayerId = await this.matchesRepository.getPlayerIdByUserId(requestUserId);
    if (!requestPlayerId) {
      throw new BadRequestException('Jugador no encontrado');
    }

    const requestStatus = await this.matchesRepository.getPlayerMatchStatus(matchId, requestPlayerId);
    if (requestStatus !== 'REQUESTED') {
      throw new BadRequestException('No hay una solicitud pendiente de este jugador');
    }

    await this.matchesRepository.leave(matchId, requestPlayerId);

    const updated = await this.findOne(matchId, approverUserId);
    this.realtimeGateway.emitMatchUpdated(updated);
    return updated;
  }

  async leaveMatch(matchId: string, userId: string) {
    const playerId = await this.matchesRepository.getPlayerIdByUserId(userId);
    if (!playerId) {
      throw new BadRequestException('Jugador no encontrado');
    }
    await this.matchesRepository.leave(matchId, playerId);
    const updated = await this.findOne(matchId);
    if (updated.status === 'FULL') {
      await this.matchesRepository.updateStatus(matchId, 'OPEN');
    }
    this.realtimeGateway.emitMatchLeft({ matchId, userId });
    this.realtimeGateway.emitMatchUpdated(updated);
    return updated;
  }

  getDepositStatus(matchId: string, userId: string) {
    return this.paymentsService.getDepositStatusForUser(matchId, userId);
  }

  createDepositCheckout(matchId: string, userId: string) {
    return this.paymentsService.createCheckout(matchId, userId);
  }

  async simulateDepositPayment(matchId: string, userId: string) {
    const checkout = await this.paymentsService.createCheckout(matchId, userId);
    if (checkout.depositId) {
      await this.paymentsService.simulateMockPayment(checkout.depositId, userId);
    }
    const match = await this.findOne(matchId, userId);
    this.realtimeGateway.emitMatchUpdated(match);
    return { ok: true, match };
  }

  async confirmMatch(matchId: string, userId: string) {
    const match = await this.findOne(matchId);
    const playerId = await this.matchesRepository.getPlayerIdByUserId(userId);
    if (!playerId) {
      throw new BadRequestException('Jugador no encontrado');
    }

    const isParticipant = match.players.some((p: { playerId: string }) => p.playerId === playerId);
    if (!isParticipant) {
      throw new BadRequestException('No participas de este partido');
    }

    if (!['FULL', 'OPEN'].includes(match.status)) {
      throw new BadRequestException('Este partido no requiere confirmación en este estado');
    }

    await this.paymentsService.assertDepositPaid(matchId, playerId);
    await this.matchesRepository.confirmPlayer(matchId, playerId);

    const joinedCount = await this.matchesRepository.countJoinedPlayers(matchId);
    const confirmedCount = await this.matchesRepository.countConfirmedPlayers(matchId);

    if (joinedCount >= match.needed_players && confirmedCount >= match.needed_players) {
      await this.matchesRepository.updateStatus(matchId, 'CONFIRMED');
    } else if (match.status === 'OPEN' && joinedCount >= match.needed_players) {
      await this.matchesRepository.updateStatus(matchId, 'FULL');
    }

    const updated = await this.findOne(matchId);
    this.realtimeGateway.emitMatchUpdated(updated);
    return updated;
  }

  async updateMatchStatus(matchId: string, dto: UpdateMatchStatusDto) {
    const result = await this.matchesRepository.updateStatus(matchId, dto.status);
    const match = await this.matchesRepository.getDetail(matchId);
    this.realtimeGateway.emitMatchUpdated(match ?? result.rows[0]);
    return match ?? result.rows[0];
  }

  private async assertMatchParticipant(matchId: string, userId: string) {
    const match = await this.matchesRepository.getDetail(matchId);
    if (!match) {
      throw new NotFoundException('Partido no encontrado');
    }
    const isParticipant = match.players.some((p: { id: string }) => p.id === userId);
    if (!isParticipant) {
      throw new BadRequestException('Solo los jugadores del partido pueden gestionar el resultado');
    }
    return match;
  }

  async submitResult(matchId: string, userId: string, dto: CreateMatchResultDto) {
    const match = await this.assertMatchParticipant(matchId, userId);

    if (match.status === 'DISPUTED') {
      throw new BadRequestException(
        'Este partido cerró sin acuerdo. No se pueden cargar más resultados ni puntos.',
      );
    }

    if (!['CONFIRMED', 'IN_PROGRESS', 'FINISHED'].includes(match.status)) {
      throw new BadRequestException(
        'El partido debe estar confirmado o en juego para cargar el resultado',
      );
    }

    if (match.result?.status === 'confirmed') {
      throw new BadRequestException('El resultado ya fue confirmado por todos los jugadores');
    }

    if (match.result?.disputed || match.result?.status === 'disputed') {
      throw new BadRequestException('Este partido cerró sin acuerdo');
    }

    const parsed = parseBestOfThreeSets(dto.sets);
    await this.matchesRepository.proposeResult(matchId, userId, parsed);
    await this.matchesRepository.addResultConfirmation(matchId, userId);
    await this.saveOptionalPlayerRatings(matchId, userId, dto.playerRatings);

    if (match.status !== 'IN_PROGRESS' && match.status !== 'FINISHED') {
      await this.matchesRepository.updateStatus(matchId, 'IN_PROGRESS');
    }

    const finalized = await this.tryFinalizeResultIfAllConfirmed(matchId);
    const detail = await this.findOne(matchId);
    this.realtimeGateway.emitMatchScoreUpdated({ matchId, finalized });
    this.realtimeGateway.emitMatchUpdated(detail);
    return detail.result;
  }

  async rejectResult(matchId: string, userId: string, dto?: RejectMatchResultDto) {
    const match = await this.assertMatchParticipant(matchId, userId);

    if (match.status === 'DISPUTED') {
      throw new BadRequestException('Este partido ya cerró sin acuerdo');
    }

    if (!match.result || match.result.status === 'confirmed') {
      throw new BadRequestException('No hay un resultado pendiente para rechazar');
    }

    if (match.result.submittedByUserId === userId) {
      throw new BadRequestException(
        'Si querés cambiar tu propuesta, usá "Proponer otro resultado"',
      );
    }

    if (match.result.confirmations?.some((c: { userId: string }) => c.userId === userId)) {
      throw new BadRequestException('Ya confirmaste este resultado');
    }

    await this.matchesRepository.addResultRejection(matchId, userId, dto?.comment);

    const detail = await this.findOne(matchId);
    this.realtimeGateway.emitMatchUpdated(detail);

    return {
      rejected: true,
      result: detail.result,
    };
  }

  async confirmResult(matchId: string, userId: string, dto?: ConfirmMatchResultDto) {
    const match = await this.assertMatchParticipant(matchId, userId);

    if (match.status === 'DISPUTED') {
      throw new BadRequestException('Este partido ya cerró sin acuerdo');
    }

    if (!match.result || match.result.status === 'confirmed') {
      throw new BadRequestException('No hay un resultado pendiente de confirmación');
    }

    if (match.result.rejections?.some((r: { userId: string }) => r.userId === userId)) {
      throw new BadRequestException(
        'Rechazaste este resultado. Proponé otro marcador o esperá a que la otra pareja lo actualice.',
      );
    }

    await this.matchesRepository.addResultConfirmation(matchId, userId);
    await this.saveOptionalPlayerRatings(matchId, userId, dto?.playerRatings);
    const finalized = await this.tryFinalizeResultIfAllConfirmed(matchId);
    const detail = await this.findOne(matchId);
    this.realtimeGateway.emitMatchScoreUpdated({ matchId, finalized });
    this.realtimeGateway.emitMatchUpdated(detail);

    return {
      confirmed: true,
      finalized,
      result: detail.result,
    };
  }

  private async tryFinalizeResultIfAllConfirmed(matchId: string): Promise<boolean> {
    const match = await this.matchesRepository.getDetail(matchId);
    if (!match?.result || match.result.status === 'confirmed') {
      return match?.result?.status === 'confirmed';
    }

    const participantIds = await this.matchesRepository.getParticipantUserIds(matchId);
    const confirmationCount = await this.matchesRepository.countResultConfirmations(matchId);

    if (participantIds.length === 0 || confirmationCount < participantIds.length) {
      return false;
    }

    return this.finalizeMatchWithPoints(matchId, false);
  }

  private async finalizeMatchWithPoints(matchId: string, autoFinalized: boolean) {
    const finalized = await this.matchesRepository.finalizeResult(matchId, autoFinalized);
    await this.matchesRepository.updateStatus(matchId, 'FINISHED');
    const winnerTeam = finalized.rows[0]?.winner_team as string;
    await this.clubPointsService.awardForFinishedMatch(matchId, winnerTeam);
    await this.competitiveScoringService.awardForFinishedMatch(matchId);
    await this.applyMatchRatings(matchId, winnerTeam);
    await this.badgesService.evaluateForFinishedMatch(matchId);
    const detail = await this.findOne(matchId);
    this.realtimeGateway.emitMatchUpdated(detail);
    return true;
  }

  private async applyMatchRatings(matchId: string, winnerTeam: string | null | undefined) {
    if (await this.matchesRepository.hasRatingHistory(matchId)) {
      return;
    }

    const match = await this.matchesRepository.getById(matchId);
    if (!match) return;

    const detail = await this.matchesRepository.getDetail(matchId);
    const sets = (detail?.result?.sets ?? []) as Array<{ teamA: number; teamB: number }>;

    const participants = await this.matchesRepository.getParticipantsForRating(matchId);
    if (participants.length < 2) {
      return;
    }

    const neededPlayers = Number(match.needed_players) || participants.length;
    const { teamA, teamB } = splitParticipantsByTeam(participants, neededPlayers);
    if (teamA.length === 0 || teamB.length === 0) {
      return;
    }

    const priorEncounters = await this.matchesRepository.countRecentTeamMatchups(
      matchId,
      teamA.map((player) => player.userId),
      teamB.map((player) => player.userId),
    );

    const normalizedWinner = String(winnerTeam || '')
      .toUpperCase()
      .trim();
    const winner: 'A' | 'B' | null =
      normalizedWinner === 'A' ? 'A' : normalizedWinner === 'B' ? 'B' : null;

    const changes = computeMatchRatingChanges({
      participants: participants.map((player) => ({
        userId: player.userId,
        rating: resolvePlayerRating(player),
        rank: player.rank,
      })),
      neededPlayers,
      winnerTeam: winner,
      priorEncounters,
      sets,
    });

    await this.matchesRepository.savePlayerRatingHistory(
      matchId,
      changes.map((change) => ({
        userId: change.userId,
        ratingBefore: change.ratingBefore,
        ratingAfter: change.ratingAfter,
        delta: change.delta,
      })),
    );
  }

  private async saveOptionalPlayerRatings(
    matchId: string,
    raterUserId: string,
    ratings?: PlayerRatingDto[],
  ) {
    if (!ratings?.length) return;
    const participantIds = await this.matchesRepository.getParticipantUserIds(matchId);
    await this.matchesRepository.savePlayerRatings(
      matchId,
      raterUserId,
      ratings,
      participantIds,
    );
  }

  /** Sin acuerdo en 48h: disputa, sin puntos; habilita reseñas a rivales. */
  async processExpiredPendingResults(): Promise<number> {
    const expired = await this.matchesRepository.listExpiredPendingResults();
    let processed = 0;

    for (const row of expired) {
      await this.closeMatchAsDisputed(row.match_id);
      processed += 1;
    }

    return processed;
  }

  async closeMatchAsDisputed(matchId: string) {
    await this.matchesRepository.closeAsDisputedWithoutPoints(matchId);
    const detail = await this.findOne(matchId);
    this.realtimeGateway.emitMatchUpdated(detail);
    return detail;
  }

  async submitRivalReviews(matchId: string, userId: string, dto: ConfirmMatchResultDto) {
    const match = await this.findOne(matchId, userId);
    if (match.status !== 'DISPUTED') {
      throw new BadRequestException('Solo podés dejar reseñas en partidos cerrados sin acuerdo');
    }
    if (!match.can_submit_rival_reviews) {
      throw new BadRequestException('El plazo para dejar reseñas a rivales ya venció');
    }

    const isParticipant = match.players.some((p: { id: string }) => p.id === userId);
    if (!isParticipant) {
      throw new BadRequestException('Solo los jugadores del partido pueden dejar reseñas');
    }

    const opponents = await this.matchesRepository.getOpponentUserIds(matchId, userId);
    const ratings = (dto.playerRatings ?? []).filter((r) => opponents.includes(r.userId));

    if (ratings.length > 0) {
      await this.matchesRepository.savePlayerRatings(matchId, userId, ratings, opponents);
    }

    const detail = await this.findOne(matchId, userId);
    return {
      saved: ratings.length,
      result: detail.result,
      canSubmitRivalReviews: detail.can_submit_rival_reviews,
    };
  }
}
