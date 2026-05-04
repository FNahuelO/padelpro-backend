import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';

@Injectable()
export class ClubsService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    const result = await this.db.query(
      `SELECT id, name, city, zone, address, phone, logo_url, created_at
       FROM clubs
       ORDER BY name ASC`,
    );
    return result.rows;
  }

  async findOne(id: string) {
    const result = await this.db.query(
      `SELECT id, name, city, zone, address, phone, logo_url, created_at, updated_at
       FROM clubs
       WHERE id = $1`,
      [id],
    );
    const club = result.rows[0];

    if (!club) {
      throw new NotFoundException('Club no encontrado');
    }

    return club;
  }

  async create(userId: string, dto: CreateClubDto) {
    await this.assertOrganizerRole(userId);
    const result = await this.db.query(
      `INSERT INTO clubs (name, city, zone, address, phone, logo_url)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, name, city, zone, address, phone, logo_url, created_at, updated_at`,
      [
        dto.name,
        dto.city ?? null,
        dto.zone ?? null,
        dto.address ?? null,
        dto.phone ?? null,
        dto.logoUrl ?? null,
      ],
    );
    return result.rows[0];
  }

  async update(userId: string, clubId: string, dto: UpdateClubDto) {
    await this.assertOrganizerRole(userId);
    const result = await this.db.query(
      `UPDATE clubs
       SET name = COALESCE($2, name),
           city = COALESCE($3, city),
           zone = COALESCE($4, zone),
           address = COALESCE($5, address),
           phone = COALESCE($6, phone),
           logo_url = COALESCE($7, logo_url),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, city, zone, address, phone, logo_url, created_at, updated_at`,
      [
        clubId,
        dto.name ?? null,
        dto.city ?? null,
        dto.zone ?? null,
        dto.address ?? null,
        dto.phone ?? null,
        dto.logoUrl ?? null,
      ],
    );
    const club = result.rows[0];
    if (!club) {
      throw new NotFoundException('Club no encontrado');
    }
    return club;
  }

  private async assertOrganizerRole(userId: string) {
    const result = await this.db.query(`SELECT role FROM users WHERE id = $1`, [userId]);
    const role = result.rows[0]?.role;
    if (!role || !['CLUB_ADMIN', 'SUPER_ADMIN'].includes(role)) {
      throw new ForbiddenException('Solo organizadores pueden gestionar clubes');
    }
  }
}

