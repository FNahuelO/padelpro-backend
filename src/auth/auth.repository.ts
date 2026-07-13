import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  PLACEMENT_INITIAL_RATING,
  type PlayerCategory,
} from '../common/utils';

@Injectable()
export class AuthRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByEmail(email: string) {
    const result = await this.db.query(
      `SELECT id, email, password_hash, name, role
       FROM users
       WHERE lower(email) = lower($1)`,
      [email],
    );
    return result.rows[0] ?? null;
  }

  async findByNickname(nickname: string) {
    const result = await this.db.query(
      `SELECT p.id, p.user_id, p.nickname
       FROM players p
       WHERE lower(p.nickname) = lower($1)`,
      [nickname],
    );
    return result.rows[0] ?? null;
  }

  async findById(userId: string) {
    const result = await this.db.query(
      `SELECT id, email, password_hash, name, role
       FROM users
       WHERE id = $1`,
      [userId],
    );
    return result.rows[0] ?? null;
  }

  async findMe(userId: string) {
    const result = await this.db.query(
      `SELECT
        u.id,
        u.email,
        u.name,
        u.role,
        p.nickname,
        p.city,
        p.zone,
        p.level,
        p.rating,
        p.position,
        p.bio,
        p.photo_url,
        p.extras,
        p.category_status,
        p.placement_matches_played
      FROM users u
      LEFT JOIN players p ON p.user_id = u.id
      WHERE u.id = $1`,
      [userId],
    );
    return result.rows[0] ?? null;
  }

  async createUser(input: {
    email: string;
    passwordHash: string;
    name: string;
    role: 'PLAYER' | 'CLUB_ADMIN' | 'ORGANIZER';
  }) {
    const result = await this.db.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4::user_role)
       RETURNING id, email, name, role`,
      [input.email, input.passwordHash, input.name, input.role],
    );
    return result.rows[0];
  }

  async createPlayerForUser(
    userId: string,
    options?: {
      declaredCategory?: PlayerCategory | null;
      nickname?: string | null;
      gender?: string | null;
    },
  ) {
    const declaredCategory = options?.declaredCategory ?? null;
    const nickname = options?.nickname?.trim() || null;
    const gender = options?.gender?.trim() || null;
    const extrasPayload: Record<string, string> = {};
    if (declaredCategory != null) extrasPayload.declaredCategory = declaredCategory;
    if (gender != null) extrasPayload.gender = gender;
    const extras =
      Object.keys(extrasPayload).length > 0 ? JSON.stringify(extrasPayload) : null;
    // Solo jugadores con categoría declarada entran en nivelación.
    const startsInPlacement = declaredCategory != null;
    const categoryStatus = startsInPlacement ? 'provisional' : 'confirmed';
    const placementMatchesPlayed = startsInPlacement ? 0 : 5;
    const rating = startsInPlacement ? PLACEMENT_INITIAL_RATING : 1000;

    await this.db.query(
      `INSERT INTO players (
         user_id, nickname, rating, extras, category_status, placement_matches_played
       )
       VALUES ($1, $2, $3, COALESCE($4::jsonb, '{}'::jsonb), $5, $6)
       ON CONFLICT (user_id) DO UPDATE
         SET nickname = COALESCE(EXCLUDED.nickname, players.nickname),
             rating = COALESCE(players.rating, EXCLUDED.rating),
             category_status = COALESCE(players.category_status, EXCLUDED.category_status),
             placement_matches_played = COALESCE(
               players.placement_matches_played,
               EXCLUDED.placement_matches_played
             ),
             extras = CASE
               WHEN $4::jsonb IS NULL THEN players.extras
               ELSE COALESCE(players.extras, '{}'::jsonb) || $4::jsonb
             END`,
      [userId, nickname, rating, extras, categoryStatus, placementMatchesPlayed],
    );
  }

  async updatePassword(userId: string, passwordHash: string) {
    await this.db.query(
      `UPDATE users
       SET password_hash = $2, updated_at = NOW()
       WHERE id = $1`,
      [userId, passwordHash],
    );
  }

  async invalidatePasswordResetTokens(userId: string) {
    await this.db.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE user_id = $1 AND used_at IS NULL`,
      [userId],
    );
  }

  async createPasswordResetToken(userId: string, codeHash: string, expiresAt: Date) {
    const result = await this.db.query(
      `INSERT INTO password_reset_tokens (user_id, code_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id, expires_at`,
      [userId, codeHash, expiresAt.toISOString()],
    );
    return result.rows[0];
  }

  async findValidPasswordResetToken(userId: string, codeHash: string) {
    const result = await this.db.query(
      `SELECT id, user_id, code_hash, expires_at, used_at
       FROM password_reset_tokens
       WHERE user_id = $1
         AND code_hash = $2
         AND used_at IS NULL
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, codeHash],
    );
    return result.rows[0] ?? null;
  }

  async markPasswordResetTokenUsed(tokenId: string) {
    await this.db.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE id = $1`,
      [tokenId],
    );
  }
}
