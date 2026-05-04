import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { PlayersRepository } from './players.repository';

@Injectable()
export class PlayersService {
  constructor(private readonly playersRepository: PlayersRepository) {}

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
    const player = await this.playersRepository.getById(playerId);
    if (!player) {
      throw new NotFoundException('Jugador no encontrado');
    }
    return player;
  }
}
