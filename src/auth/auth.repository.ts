import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByEmail(email: string) {
    const mode = await this.db.getSchemaMode();
    if (mode === 'prisma') {
      const result = await this.db.query(
        `SELECT id, email, password AS password_hash, name, 'PLAYER' AS role
         FROM users
         WHERE email = $1`,
        [email],
      );
      return result.rows[0] ?? null;
    }

    const result = await this.db.query(
      `SELECT id, email, password_hash, name, role
       FROM users
       WHERE email = $1`,
      [email],
    );
    return result.rows[0] ?? null;
  }

  async findMe(userId: string) {
    const mode = await this.db.getSchemaMode();
    if (mode === 'prisma') {
      const result = await this.db.query(
        `SELECT
          u.id,
          u.email,
          u.name,
          'PLAYER' AS role,
          u.name AS nickname,
          u.location AS city,
          NULL::text AS zone,
          ROUND((u.rating::numeric / 400), 1) AS level,
          u."courtPosition" AS position,
          u.description AS bio,
          u.photo AS photo_url
        FROM users u
        WHERE u.id = $1`,
        [userId],
      );
      return result.rows[0] ?? null;
    }

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
        p.position,
        p.bio,
        p.photo_url
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
    role: 'PLAYER' | 'CLUB_ADMIN';
  }) {
    const mode = await this.db.getSchemaMode();
    if (mode === 'prisma') {
      const id = randomUUID();
      const result = await this.db.query(
        `INSERT INTO users (id, email, password, name, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id, email, name`,
        [id, input.email, input.passwordHash, input.name],
      );
      const row = result.rows[0];
      return { ...row, role: input.role };
    }

    const result = await this.db.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role`,
      [input.email, input.passwordHash, input.name, input.role],
    );
    return result.rows[0];
  }

  async createPlayerForUser(userId: string) {
    if ((await this.db.getSchemaMode()) === 'prisma') {
      return;
    }

    await this.db.query(
      `INSERT INTO players (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId],
    );
  }
}
