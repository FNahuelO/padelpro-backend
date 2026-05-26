import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { PlayersRepository } from './players.repository';

@Injectable()
export class PlayersService {
  constructor(
    private readonly playersRepository: PlayersRepository,
    private readonly usersService: UsersService,
  ) {}

  async getMe(userId: string) {
    const player = await this.playersRepository.getByUserId(userId);
    if (!player) {
      throw new NotFoundException('Perfil de jugador no encontrado');
    }
    return player;
  }

  updateMe(userId: string, dto: UpdatePlayerDto) {
    return this.playersRepository.updateMe(userId, dto);
  }

  list() {
    return this.playersRepository.listPlayers();
  }

  async getById(playerId: string) {
    let player = await this.playersRepository.getById(playerId);
    if (!player) {
      player = await this.playersRepository.getByUserId(playerId);
    }
    if (!player) {
      throw new NotFoundException('Jugador no encontrado');
    }

    const matchStats = await this.usersService.getMatchStats(player.user_id);
    return {
      ...player,
      match_stats: matchStats,
    };
  }

  async search(query: string | undefined, excludeUserId: string) {
    const q = query?.trim() ?? '';
    if (q.length < 2) {
      return [];
    }
    const result = await this.playersRepository.searchPlayers(q, excludeUserId);
    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      nickname: row.nickname,
      level: row.level != null ? Number(row.level) : null,
      photo: row.photo_url,
      zone: row.zone,
      city: row.city,
    }));
  }
}
