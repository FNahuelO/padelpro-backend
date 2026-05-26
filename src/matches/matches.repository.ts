import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateMatchDto } from './dto/create-match.dto';
import type { ParsedBestOfThree } from '../common/utils/match-result.util';
import type { PlayerRatingDto } from './dto/player-rating.dto';
import { userTeamFromRank } from '../common/utils/match-result.util';

export const RESULT_CONFIRM_HOURS = 48;

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

  async getDetail(matchId: string) {
    const match = await this.getById(matchId);
    if (!match) return null;

    const players = await this.db.query(
      `SELECT p.id,
              p.user_id,
              u.name,
              p.level,
              p.photo_url,
              mp.status AS player_status
       FROM match_players mp
       INNER JOIN players p ON p.id = mp.player_id
       INNER JOIN users u ON u.id = p.user_id
       WHERE mp.match_id = $1 AND mp.status IN ('JOINED', 'CONFIRMED')
       ORDER BY mp.created_at ASC`,
      [matchId],
    );

    let club = null;
    if (match.club_id) {
      const clubResult = await this.db.query(
        `SELECT id, name, city, zone, address FROM clubs WHERE id = $1`,
        [match.club_id],
      );
      club = clubResult.rows[0] ?? null;
    }

    const resultRow = await this.db.query(
      `SELECT mr.score,
              mr.winner_team,
              mr.sets,
              mr.result_status,
              mr.created_by_user_id,
              mr.confirmed,
              mr.proposed_at,
              mr.confirm_deadline_at,
              mr.auto_finalized,
              u.name AS submitted_by_name
       FROM match_results mr
       LEFT JOIN users u ON u.id = mr.created_by_user_id
       WHERE mr.match_id = $1`,
      [matchId],
    );

    let confirmations: { userId: string; name: string; confirmedAt: string }[] = [];
    if (resultRow.rows[0]) {
      const confRes = await this.db.query(
        `SELECT mrc.user_id, u.name, mrc.created_at
         FROM match_result_confirmations mrc
         INNER JOIN users u ON u.id = mrc.user_id
         WHERE mrc.match_id = $1
         ORDER BY mrc.created_at ASC`,
        [matchId],
      );
      confirmations = confRes.rows.map((c) => ({
        userId: c.user_id,
        name: c.name,
        confirmedAt: c.created_at,
      }));
    }

    let rejections: { userId: string; name: string; comment?: string; rejectedAt: string }[] = [];
    if (resultRow.rows[0]) {
      const rejRes = await this.db.query(
        `SELECT mrr.user_id, u.name, mrr.comment, mrr.created_at
         FROM match_result_rejections mrr
         INNER JOIN users u ON u.id = mrr.user_id
         WHERE mrr.match_id = $1
         ORDER BY mrr.created_at ASC`,
        [matchId],
      );
      rejections = rejRes.rows.map((r) => ({
        userId: r.user_id,
        name: r.name,
        comment: r.comment ?? undefined,
        rejectedAt: r.created_at,
      }));
    }

    const joinedCount = players.rows.length;
    const row = resultRow.rows[0];
    const disputedAt = match.disputed_at ?? null;
    const rivalReviewDeadline = match.rival_review_deadline_at ?? null;
    const now = Date.now();
    const canSubmitRivalReviews =
      match.status === 'DISPUTED' &&
      disputedAt != null &&
      rivalReviewDeadline != null &&
      new Date(rivalReviewDeadline).getTime() > now;

    return {
      ...match,
      disputed_at: disputedAt,
      rival_review_deadline_at: rivalReviewDeadline,
      can_submit_rival_reviews: canSubmitRivalReviews,
      club,
      joined_count: joinedCount,
      needed_players: match.needed_players,
      players: players.rows.map((p) => ({
        id: p.user_id,
        playerId: p.id,
        name: p.name,
        level: Number(p.level),
        photo: p.photo_url,
        status: p.player_status,
      })),
      result: row
        ? {
            score: row.score,
            winnerTeam: row.winner_team,
            sets: row.sets ?? [],
            status: row.result_status ?? (row.confirmed ? 'confirmed' : 'pending'),
            disputed: row.result_status === 'disputed',
            submittedByUserId: row.created_by_user_id,
            submittedByName: row.submitted_by_name,
            confirmations,
            rejections,
            requiredConfirmations: joinedCount,
            confirmed:
              row.result_status === 'confirmed' || row.confirmed === true,
            proposedAt: row.proposed_at,
            confirmDeadlineAt: row.confirm_deadline_at,
            autoFinalized: row.auto_finalized === true,
          }
        : undefined,
    };
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
      `SELECT m.*,
        (SELECT COUNT(*)::int FROM match_players mp2 WHERE mp2.match_id = m.id AND mp2.status IN ('JOINED','CONFIRMED')) AS joined_count
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

  async getPlayerLevelByUserId(userId: string) {
    const result = await this.db.query(`SELECT level FROM players WHERE user_id = $1`, [userId]);
    return result.rows[0]?.level != null ? Number(result.rows[0].level) : null;
  }

  async join(matchId: string, playerId: string, status: 'JOINED' | 'CONFIRMED' = 'JOINED') {
    await this.db.query(
      `INSERT INTO match_players (match_id, player_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (match_id, player_id)
       DO UPDATE SET status = EXCLUDED.status`,
      [matchId, playerId, status],
    );
  }

  async confirmPlayer(matchId: string, playerId: string) {
    await this.db.query(
      `UPDATE match_players SET status = 'CONFIRMED'
       WHERE match_id = $1 AND player_id = $2 AND status IN ('JOINED', 'CONFIRMED')`,
      [matchId, playerId],
    );
  }

  async leave(matchId: string, playerId: string) {
    await this.db.query(
      `UPDATE match_players SET status = 'LEFT' WHERE match_id = $1 AND player_id = $2`,
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

  async countConfirmedPlayers(matchId: string) {
    const result = await this.db.query(
      `SELECT COUNT(*)::int AS count FROM match_players WHERE match_id = $1 AND status = 'CONFIRMED'`,
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
      `INSERT INTO chats (match_id, type) VALUES ($1, 'MATCH') ON CONFLICT (match_id) DO NOTHING`,
      [matchId],
    );
  }

  async getParticipantUserIds(matchId: string): Promise<string[]> {
    const result = await this.db.query(
      `SELECT p.user_id
       FROM match_players mp
       INNER JOIN players p ON p.id = mp.player_id
       WHERE mp.match_id = $1 AND mp.status IN ('JOINED', 'CONFIRMED')`,
      [matchId],
    );
    return result.rows.map((r) => r.user_id as string);
  }

  async proposeResult(matchId: string, userId: string, parsed: ParsedBestOfThree) {
    await this.db.query(`DELETE FROM match_result_confirmations WHERE match_id = $1`, [matchId]);
    await this.db.query(`DELETE FROM match_result_rejections WHERE match_id = $1`, [matchId]);

    return this.db.query(
      `INSERT INTO match_results (
         match_id, winner_team, score, sets, created_by_user_id, confirmed, result_status,
         proposed_at, confirm_deadline_at, auto_finalized
       ) VALUES (
         $1, $2, $3, $4::jsonb, $5, false, 'pending',
         NOW(), NOW() + ($6::text || ' hours')::interval, false
       )
       ON CONFLICT (match_id)
       DO UPDATE SET
         winner_team = EXCLUDED.winner_team,
         score = EXCLUDED.score,
         sets = EXCLUDED.sets,
         created_by_user_id = EXCLUDED.created_by_user_id,
         confirmed = false,
         result_status = 'pending',
         proposed_at = NOW(),
         confirm_deadline_at = NOW() + ($6::text || ' hours')::interval,
         auto_finalized = false,
         created_at = NOW()
       RETURNING *`,
      [
        matchId,
        parsed.winnerTeam,
        parsed.scoreSummary,
        JSON.stringify(parsed.sets),
        userId,
        String(RESULT_CONFIRM_HOURS),
      ],
    );
  }

  async addResultConfirmation(matchId: string, userId: string) {
    await this.db.query(
      `INSERT INTO match_result_confirmations (match_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (match_id, user_id) DO NOTHING`,
      [matchId, userId],
    );
  }

  async countResultConfirmations(matchId: string) {
    const result = await this.db.query(
      `SELECT COUNT(*)::int AS count FROM match_result_confirmations WHERE match_id = $1`,
      [matchId],
    );
    return result.rows[0].count as number;
  }

  async finalizeResult(matchId: string, autoFinalized = false) {
    return this.db.query(
      `UPDATE match_results
       SET result_status = 'confirmed', confirmed = true, auto_finalized = $2
       WHERE match_id = $1
       RETURNING *`,
      [matchId, autoFinalized],
    );
  }

  async closeAsDisputedWithoutPoints(matchId: string) {
    await this.db.query(
      `UPDATE match_results
       SET result_status = 'disputed',
           confirmed = false,
           auto_finalized = true,
           score = CASE
             WHEN COALESCE(score, '') LIKE '%Sin acuerdo%' THEN score
             ELSE TRIM(COALESCE(score, 'Sin resultado')) || ' — Sin acuerdo en 48 h'
           END
       WHERE match_id = $1`,
      [matchId],
    );
    return this.db.query(
      `UPDATE matches
       SET status = 'DISPUTED',
           disputed_at = NOW(),
           rival_review_deadline_at = NOW() + interval '48 hours',
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [matchId],
    );
  }

  async getOpponentUserIds(matchId: string, userId: string): Promise<string[]> {
    const team = await this.getUserTeamInMatch(matchId, userId);
    if (!team) return [];

    const matchRow = await this.db.query(`SELECT needed_players FROM matches WHERE id = $1`, [
      matchId,
    ]);
    const neededPlayers = Number(matchRow.rows[0]?.needed_players) || 4;

    const result = await this.db.query(
      `SELECT p.user_id,
              ROW_NUMBER() OVER (ORDER BY mp.created_at) AS rnk
       FROM match_players mp
       INNER JOIN players p ON p.id = mp.player_id
       WHERE mp.match_id = $1 AND mp.status IN ('JOINED', 'CONFIRMED')`,
      [matchId],
    );

    return result.rows
      .filter((row) => userTeamFromRank(Number(row.rnk), neededPlayers) !== team)
      .map((row) => row.user_id as string);
  }

  async hasUserSubmittedRivalReviews(matchId: string, userId: string): Promise<boolean> {
    const opponents = await this.getOpponentUserIds(matchId, userId);
    if (opponents.length === 0) return true;

    const result = await this.db.query(
      `SELECT COUNT(DISTINCT rated_user_id)::int AS count
       FROM match_player_ratings
       WHERE match_id = $1 AND rater_user_id = $2 AND rated_user_id = ANY($3::uuid[])`,
      [matchId, userId, opponents],
    );
    return (result.rows[0]?.count ?? 0) >= opponents.length;
  }

  async listExpiredPendingResults() {
    const result = await this.db.query(
      `SELECT mr.match_id, mr.created_by_user_id, mr.winner_team, mr.score, m.needed_players
       FROM match_results mr
       INNER JOIN matches m ON m.id = mr.match_id
       WHERE mr.result_status = 'pending'
         AND mr.confirm_deadline_at IS NOT NULL
         AND mr.confirm_deadline_at <= NOW()
         AND m.status IN ('IN_PROGRESS', 'CONFIRMED', 'FINISHED')`,
    );
    return result.rows as {
      match_id: string;
      created_by_user_id: string;
      winner_team: string;
      score: string;
      needed_players: number;
    }[];
  }

  async getUserTeamInMatch(matchId: string, userId: string): Promise<'A' | 'B' | null> {
    const result = await this.db.query(
      `SELECT m.needed_players,
              ROW_NUMBER() OVER (ORDER BY mp.created_at) AS rnk
       FROM match_players mp
       INNER JOIN players p ON p.id = mp.player_id
       INNER JOIN matches m ON m.id = mp.match_id
       WHERE mp.match_id = $1 AND p.user_id = $2 AND mp.status IN ('JOINED', 'CONFIRMED')`,
      [matchId, userId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return userTeamFromRank(Number(row.rnk), Number(row.needed_players) || 4);
  }

  async applyAutoFinalizedWinner(matchId: string, winnerTeam: 'A' | 'B') {
    return this.db.query(
      `UPDATE match_results
       SET winner_team = $2,
           score = CASE
             WHEN score LIKE '%(plazo 48h)%' THEN score
             ELSE score || ' (plazo 48h)'
           END
       WHERE match_id = $1
       RETURNING *`,
      [matchId, winnerTeam],
    );
  }

  async savePlayerRatings(
    matchId: string,
    raterUserId: string,
    ratings: PlayerRatingDto[],
    allowedUserIds: string[],
  ) {
    const allowed = new Set(allowedUserIds);
    for (const rating of ratings) {
      if (rating.userId === raterUserId) continue;
      if (!allowed.has(rating.userId)) continue;
      await this.db.query(
        `INSERT INTO match_player_ratings (match_id, rater_user_id, rated_user_id, score, comment)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (match_id, rater_user_id, rated_user_id)
         DO UPDATE SET score = EXCLUDED.score, comment = EXCLUDED.comment`,
        [matchId, raterUserId, rating.userId, rating.score, rating.comment ?? null],
      );
    }
  }

  async addResultRejection(matchId: string, userId: string, comment?: string) {
    await this.db.query(
      `INSERT INTO match_result_rejections (match_id, user_id, comment)
       VALUES ($1, $2, $3)
       ON CONFLICT (match_id, user_id)
       DO UPDATE SET comment = COALESCE(EXCLUDED.comment, match_result_rejections.comment), created_at = NOW()`,
      [matchId, userId, comment ?? null],
    );
    await this.db.query(
      `DELETE FROM match_result_confirmations WHERE match_id = $1 AND user_id = $2`,
      [matchId, userId],
    );
  }

  async getPlayerRatingsForMatch(matchId: string) {
    const result = await this.db.query(
      `SELECT mpr.rater_user_id, mpr.rated_user_id, mpr.score, mpr.comment,
              ru.name AS rater_name, rd.name AS rated_name
       FROM match_player_ratings mpr
       INNER JOIN users ru ON ru.id = mpr.rater_user_id
       INNER JOIN users rd ON rd.id = mpr.rated_user_id
       WHERE mpr.match_id = $1`,
      [matchId],
    );
    return result.rows;
  }
}
