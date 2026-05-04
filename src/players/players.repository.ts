import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UpdatePlayerDto } from './dto/update-player.dto';

@Injectable()
export class PlayersRepository {
  constructor(private readonly db: DatabaseService) {}

  async getByUserId(userId: string) {
    const result = await this.db.query(
      `SELECT p.*, u.name, u.email
       FROM players p
       INNER JOIN users u ON u.id = p.user_id
       WHERE p.user_id = $1`,
      [userId],
    );
    return result.rows[0] ?? null;
  }

  async updateMe(userId: string, dto: UpdatePlayerDto) {
    await this.db.query(
      `UPDATE players
       SET nickname = COALESCE($2, nickname),
           city = COALESCE($3, city),
           zone = COALESCE($4, zone),
           level = COALESCE($5, level),
           position = COALESCE($6, position),
           bio = COALESCE($7, bio),
           photo_url = COALESCE($8, photo_url),
           updated_at = NOW()
       WHERE user_id = $1`,
      [
        userId,
        dto.nickname ?? null,
        dto.city ?? null,
        dto.zone ?? null,
        dto.level ?? null,
        dto.position ?? null,
        dto.bio ?? null,
        dto.photoUrl ?? null,
      ],
    );
    return this.getByUserId(userId);
  }

  async listPlayers(limit = 20, offset = 0) {
    const result = await this.db.query(
      `SELECT p.*, u.name
       FROM players p
       INNER JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    return result.rows;
  }

  async getById(playerId: string) {
    const result = await this.db.query(
      `SELECT p.*, u.name
       FROM players p
       INNER JOIN users u ON u.id = p.user_id
       WHERE p.id = $1`,
      [playerId],
    );
    return result.rows[0] ?? null;
  }
}
