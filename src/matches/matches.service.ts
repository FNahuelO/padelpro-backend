import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateMatchDto } from './dto/create-match.dto';
import { CreateMatchResultDto } from './dto/create-match-result.dto';
import { UpdateMatchStatusDto } from './dto/update-match-status.dto';
import { MatchesRepository } from './matches.repository';

@Injectable()
export class MatchesService {
  constructor(
    private readonly matchesRepository: MatchesRepository,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async create(userId: string, dto: CreateMatchDto) {
    const result = await this.matchesRepository.create(userId, dto);
    const match = result.rows[0];
    await this.matchesRepository.createMatchChatIfMissing(match.id);
    this.realtimeGateway.emitMatchUpdated(match);
    return match;
  }

  async findOne(id: string) {
    const match = await this.matchesRepository.getById(id);
    if (!match) {
      throw new NotFoundException('Partido no encontrado');
    }
    return match;
  }

  findAll() {
    return this.matchesRepository.listOpen();
  }

  getMyMatches(userId: string) {
    return this.matchesRepository.listByUser(userId);
  }

  async joinMatch(matchId: string, userId: string) {
    const match = await this.findOne(matchId);
    const playerId = await this.matchesRepository.getPlayerIdByUserId(userId);
    if (!playerId) {
      throw new BadRequestException('Debes completar perfil de jugador');
    }
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

  async updateMatchStatus(matchId: string, dto: UpdateMatchStatusDto) {
    const result = await this.matchesRepository.updateStatus(matchId, dto.status);
    const match = result.rows[0];
    this.realtimeGateway.emitMatchUpdated(match);
    return match;
  }

  async submitResult(matchId: string, userId: string, dto: CreateMatchResultDto) {
    const result = await this.matchesRepository.createResult(matchId, userId, dto);
    await this.matchesRepository.updateStatus(matchId, 'FINISHED');
    this.realtimeGateway.emitMatchScoreUpdated({ matchId, ...result.rows[0] });
    return result.rows[0];
  }
}
