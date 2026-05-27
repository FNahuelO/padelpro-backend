import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { getInitialRatingForCategory, type PlayerCategory } from '../common/utils';

@Injectable()
export class AuthRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByEmail(email: string) {
    const result = await this.db.query(
      `SELECT id, email, password_hash, name, role
       FROM users
       WHERE email = $1`,
      [email],
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
        p.extras
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
    options?: { declaredCategory?: PlayerCategory | null },
  ) {
    const declaredCategory = options?.declaredCategory ?? null;
    const rating = getInitialRatingForCategory(declaredCategory);
    const extras =
      declaredCategory != null
        ? JSON.stringify({ declaredCategory })
        : null;

    await this.db.query(
      `INSERT INTO players (user_id, rating, extras)
       VALUES ($1, $2, COALESCE($3::jsonb, '{}'::jsonb))
       ON CONFLICT (user_id) DO UPDATE
         SET rating = COALESCE(players.rating, EXCLUDED.rating),
             extras = CASE
               WHEN $3::jsonb IS NULL THEN players.extras
               ELSE COALESCE(players.extras, '{}'::jsonb) || $3::jsonb
             END`,
      [userId, rating, extras],
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
}
