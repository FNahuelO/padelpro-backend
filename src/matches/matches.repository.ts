import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { CreateMatchResultDto } from './dto/create-match-result.dto';

@Injectable()
export class MatchesRepository {
  constructor(private readonly db: DatabaseService) {}

  create(createdByUserId: string, dto: CreateMatchDto) {
    return this.db.query(
      `INSERT INTO matches (
        club_id, created_by_user_id, title, description, date, zone,
        level_min, level_max, gender, mode, needed_players, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'OPEN')
      RETURNING *`,
      [
        dto.clubId ?? null,
        createdByUserId,
        dto.title,
        dto.description ?? null,
        dto.date,
        dto.zone ?? null,
        dto.levelMin ?? null,
        dto.levelMax ?? null,
        dto.gender,
        dto.mode,
        dto.neededPlayers,
      ],
    );
  }

  async getById(matchId: string) {
    const result = await this.db.query(`SELECT * FROM matches WHERE id = $1`, [matchId]);
    return result.rows[0] ?? null;
  }

  async listOpen() {
    const result = await this.db.query(
      `SELECT m.*,
        (SELECT COUNT(*)::int FROM match_players mp WHERE mp.match_id = m.id AND mp.status IN ('JOINED','CONFIRMED')) AS joined_count
       FROM matches m
       WHERE m.status IN ('OPEN', 'FULL', 'CONFIRMED')
       ORDER BY m.date ASC`,
    );
    return result.rows;
  }

  async listByUser(userId: string) {
    const result = await this.db.query(
      `SELECT m.*
       FROM matches m
       INNER JOIN players p ON p.user_id = $1
       INNER JOIN match_players mp ON mp.player_id = p.id AND mp.match_id = m.id
       WHERE mp.status IN ('JOINED', 'CONFIRMED')
       ORDER BY m.date ASC`,
      [userId],
    );
    return result.rows;
  }

  async getPlayerIdByUserId(userId: string) {
    const result = await this.db.query(`SELECT id FROM players WHERE user_id = $1`, [userId]);
    return result.rows[0]?.id ?? null;
  }

  async join(matchId: string, playerId: string) {
    await this.db.query(
      `INSERT INTO match_players (match_id, player_id, status)
       VALUES ($1, $2, 'JOINED')
       ON CONFLICT (match_id, player_id)
       DO UPDATE SET status = 'JOINED'`,
      [matchId, playerId],
    );
  }

  async leave(matchId: string, playerId: string) {
    await this.db.query(
      `UPDATE match_players
       SET status = 'LEFT'
       WHERE match_id = $1 AND player_id = $2`,
      [matchId, playerId],
    );
  }

  async countJoinedPlayers(matchId: string) {
    const result = await this.db.query(
      `SELECT COUNT(*)::int AS count
       FROM match_players
       WHERE match_id = $1 AND status IN ('JOINED', 'CONFIRMED')`,
      [matchId],
    );
    return result.rows[0].count as number;
  }

  updateStatus(matchId: string, status: string) {
    return this.db.query(
      `UPDATE matches SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [matchId, status],
    );
  }

  async createMatchChatIfMissing(matchId: string) {
    await this.db.query(
      `INSERT INTO chats (match_id, type)
       VALUES ($1, 'MATCH')
       ON CONFLICT (match_id) DO NOTHING`,
      [matchId],
    );
  }

  createResult(matchId: string, userId: string, dto: CreateMatchResultDto) {
    return this.db.query(
      `INSERT INTO match_results (match_id, winner_team, score, created_by_user_id, confirmed)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (match_id)
       DO UPDATE SET winner_team = EXCLUDED.winner_team, score = EXCLUDED.score, confirmed = EXCLUDED.confirmed
       RETURNING *`,
      [matchId, dto.winnerTeam, dto.score, userId, dto.confirmed ?? false],
    );
  }
}
