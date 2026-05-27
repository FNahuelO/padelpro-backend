import { BadRequestException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { ClubPointsService } from '../clubs/club-points.service';
import { CompetitiveScoringService } from '../competitive-scoring/competitive-scoring.service';
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
import { computeEloDelta, resolvePlayerRating } from '../common/utils';
import { parseBestOfThreeSets } from '../common/utils/match-result.util';

function userTeamFromRank(rnk: number, neededPlayers: number): 'A' | 'B' {
  const half = Math.ceil(Math.max(neededPlayers, 2) / 2);
  return rnk <= half ? 'A' : 'B';
}

@Injectable()
export class MatchesService {
  constructor(
    private readonly matchesRepository: MatchesRepository,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly clubPointsService: ClubPointsService,
    private readonly competitiveScoringService: CompetitiveScoringService,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
  ) {}

  async create(userId: string, dto: CreateMatchDto) {
    if (dto.levelMin == null || dto.levelMax == null) {
      const level = await this.matchesRepository.getPlayerSkillScoreByUserId(userId);
      const band = defaultLevelBand(level ?? 40);
      dto.levelMin = dto.levelMin ?? band.min;
      dto.levelMax = dto.levelMax ?? band.max;
    }

    const result = await this.matchesRepository.create(userId, dto);
    const match = result.rows[0];

    const playerId = await this.matchesRepository.getPlayerIdByUserId(userId);
    if (playerId) {
      await this.matchesRepository.join(match.id, playerId, 'JOINED');
    }

    await this.joinInvitedPlayers(match.id, userId, dto.invites);
    await this.syncMatchCapacityStatus(match.id);

    await this.matchesRepository.createMatchChatIfMissing(match.id);
    const detail = await this.matchesRepository.getDetail(match.id);
    this.realtimeGateway.emitMatchUpdated(detail);
    return detail;
  }

  async findOne(id: string, viewerUserId?: string) {
    const match = await this.matchesRepository.getDetail(id);
    if (!match) {
      throw new NotFoundException('Partido no encontrado');
    }
    if (viewerUserId) {
      const deposit = await this.paymentsService.getDepositStatusForUser(id, viewerUserId);
      return { ...match, deposit };
    }
    return match;
  }

  findAll() {
    return this.matchesRepository.listOpen();
  }

  getMyMatches(userId: string) {
    return this.matchesRepository.listByUser(userId);
  }

  private async assertPlayerLevel(userId: string, match: { level_min?: number | null; level_max?: number | null }) {
    const level = await this.matchesRepository.getPlayerSkillScoreByUserId(userId);
    if (level == null) return;

    const min = match.level_min != null ? Number(match.level_min) : null;
    const max = match.level_max != null ? Number(match.level_max) : null;

    if (min != null && level < min) {
      throw new BadRequestException(`Tu nivel (${level}/100) está por debajo del mínimo del partido (${min}/100)`);
    }
    if (max != null && level > max) {
      throw new BadRequestException(`Tu nivel (${level}/100) supera el máximo del partido (${max}/100)`);
    }
  }

  async resolveInvites(creatorUserId: string, invites?: MatchInviteDto[]) {
    if (!invites?.length) {
      return { orderedPlayerIds: [] as string[], invitedUserIds: [] as string[] };
    }

    const partners = invites.filter((i) => i.role === 'partner');
    const opponents = invites.filter((i) => i.role === 'opponent');

    if (partners.length > 1) {
      throw new BadRequestException('Solo podés invitar un compañero');
    }
    if (opponents.length > 2) {
      throw new BadRequestException('Solo podés invitar dos rivales');
    }

    const invitedUserIds = invites.map((i) => i.userId);
    if (new Set(invitedUserIds).size !== invitedUserIds.length) {
      throw new BadRequestException('No podés invitar al mismo jugador más de una vez');
    }
    if (invitedUserIds.includes(creatorUserId)) {
      throw new BadRequestException('No podés invitarte a vos mismo');
    }

    const orderedPlayerIds: string[] = [];

    const pushPlayerId = async (invitedUserId: string) => {
      const invitedPlayerId = await this.matchesRepository.getPlayerIdByUserId(invitedUserId);
      if (!invitedPlayerId) {
        throw new BadRequestException('Uno de los jugadores invitados no tiene perfil de jugador');
      }
      orderedPlayerIds.push(invitedPlayerId);
    };

    if (partners[0]) {
      await pushPlayerId(partners[0].userId);
    }
    for (const opponent of opponents) {
      await pushPlayerId(opponent.userId);
    }

    return { orderedPlayerIds, invitedUserIds };
  }

  async joinInvitedPlayers(matchId: string, creatorUserId: string, invites?: MatchInviteDto[]) {
    const { orderedPlayerIds } = await this.resolveInvites(creatorUserId, invites);
    for (const playerId of orderedPlayerIds) {
      await this.matchesRepository.join(matchId, playerId, 'JOINED');
    }
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

    await this.assertPlayerLevel(userId, match);
    await this.matchesRepository.join(matchId, playerId);
    await this.matchesRepository.createMatchChatIfMissing(matchId);

    const joinedCount = await this.matchesRepository.countJoinedPlayers(matchId);
    if (joinedCount >= match.needed_players && match.status === 'OPEN') {
      await this.matchesRepository.updateStatus(matchId, 'FULL');
    }

    const updated = await this.findOne(matchId);
    this.realtimeGateway.emitMatchJoined({ matchId, userId });
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

    const participants = await this.matchesRepository.getParticipantsForRating(matchId);
    if (participants.length < 2) {
      return;
    }

    const neededPlayers = Number(match.needed_players) || participants.length;
    const teamA = participants.filter((player) => userTeamFromRank(player.rank, neededPlayers) === 'A');
    const teamB = participants.filter((player) => userTeamFromRank(player.rank, neededPlayers) === 'B');
    if (teamA.length === 0 || teamB.length === 0) {
      return;
    }

    const averageRating = (team: typeof participants) =>
      team.reduce((sum, player) => sum + resolvePlayerRating(player), 0) / team.length;

    const teamARating = averageRating(teamA);
    const teamBRating = averageRating(teamB);
    const normalizedWinner = String(winnerTeam || '').toUpperCase().trim();
    const actualScoreA =
      normalizedWinner === 'A' ? 1 : normalizedWinner === 'B' ? 0 : 0.5;
    const deltaA = computeEloDelta(teamARating, teamBRating, actualScoreA);
    const deltaB = -deltaA;

    const changes = participants.map((player) => {
      const ratingBefore = resolvePlayerRating(player);
      const delta =
        userTeamFromRank(player.rank, neededPlayers) === 'A' ? deltaA : deltaB;
      return {
        userId: player.userId,
        ratingBefore,
        ratingAfter: Math.max(100, ratingBefore + delta),
        delta,
      };
    });

    await this.matchesRepository.savePlayerRatingHistory(matchId, changes);
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
