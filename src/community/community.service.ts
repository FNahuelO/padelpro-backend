import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class CommunityService {
  constructor(private readonly db: DatabaseService) {}

  async feed() {
    const openMatches = await this.db.query(
      `SELECT id, title, date, zone, needed_players, status
       FROM matches
       WHERE status IN ('OPEN', 'FULL')
       ORDER BY date ASC
       LIMIT 20`,
    );

    const recentResults = await this.db.query(
      `SELECT mr.match_id, mr.score, mr.winner_team, mr.created_at
       FROM match_results mr
       ORDER BY mr.created_at DESC
       LIMIT 10`,
    );

    return {
      openMatches: openMatches.rows,
      recentResults: recentResults.rows,
    };
  }

  async nearbyPlayers() {
    const result = await this.db.query(
      `SELECT p.id, p.nickname, p.city, p.zone, p.level, p.position, u.name
       FROM players p
       INNER JOIN users u ON u.id = p.user_id
       ORDER BY p.updated_at DESC
       LIMIT 20`,
    );
    return result.rows;
  }
}
