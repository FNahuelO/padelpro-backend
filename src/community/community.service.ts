import { Injectable } from '@nestjs/common';
import { ALL_CATEGORIES, getLevelCategory } from '../common/utils';
import { getCategoryLevelRange } from '../common/utils/level-range.util';
import { DatabaseService } from '../database/database.service';
import { resolvePlayerRating } from '../common/utils/player-rating.util';
import { MatchesService } from '../matches/matches.service';

@Injectable()
export class CommunityService {
  constructor(
    private readonly db: DatabaseService,
    private readonly matchesService: MatchesService,
  ) {}

  async feed(userId: string) {
    await this.matchesService.expirePastCourtWindowMatches();
    const viewer = await this.db.query(
      `SELECT p.level, p.rating
       FROM players p
       WHERE p.user_id = $1`,
      [userId],
    );

    const viewerRow = viewer.rows[0];
    let levelFilter = '';
    const params: Array<string | number> = [];

    if (viewerRow) {
      const myCategory = getLevelCategory(resolvePlayerRating(viewerRow));
      const categoryIndex = ALL_CATEGORIES.indexOf(myCategory as (typeof ALL_CATEGORIES)[number]);
      if (categoryIndex >= 0) {
        const neighbourCategories = ALL_CATEGORIES.slice(
          Math.max(0, categoryIndex - 1),
          Math.min(ALL_CATEGORIES.length, categoryIndex + 2),
        );
        const ranges = neighbourCategories.map((category) => getCategoryLevelRange(category));
        const minLevel = Math.min(...ranges.map((range) => range.min));
        const maxLevel = Math.max(...ranges.map((range) => range.max));
        params.push(minLevel, maxLevel);
        levelFilter = `AND (
          CASE
            WHEN m.level_max IS NULL THEN 100
            WHEN m.level_max <= 7 THEN ROUND(((m.level_max - 1) * 100.0) / 6)
            ELSE m.level_max
          END
        ) >= $1
        AND (
          CASE
            WHEN m.level_min IS NULL THEN 0
            WHEN m.level_min <= 7 THEN ROUND(((m.level_min - 1) * 100.0) / 6)
            ELSE m.level_min
          END
        ) <= $2`;
      }
    }

    const openMatches = await this.db.query(
      `SELECT m.id,
              m.title,
              m.date,
              m.zone,
              m.needed_players,
              m.status,
              m.level_min,
              m.level_max,
              c.id AS club_id,
              c.name AS club_name,
              (
                SELECT COUNT(*)::int
                FROM match_players mp
                WHERE mp.match_id = m.id AND mp.status IN ('JOINED', 'CONFIRMED')
              ) AS joined_count
       FROM matches m
       LEFT JOIN clubs c ON c.id = m.club_id
       WHERE m.status IN ('OPEN', 'FULL')
       ${levelFilter}
       ORDER BY m.date ASC
       LIMIT 20`,
      params,
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
