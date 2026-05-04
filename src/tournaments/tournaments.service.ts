import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTournamentPhotoDto } from './dto/create-tournament-photo.dto';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class TournamentsService {
  constructor(private readonly db: DatabaseService) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async create(userId: string, dto: any) {
    await this.assertOrganizerRole(userId);
    const result = await this.db.query(
      `INSERT INTO tournaments (club_id, name, description, category, format, gender, start_date, max_teams, price, rules, prizes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'DRAFT')
       RETURNING *`,
      [
        dto.clubId ?? null,
        dto.name,
        dto.description ?? null,
        dto.category ?? null,
        dto.format ?? null,
        dto.gender ?? null,
        dto.startDate ?? null,
        dto.maxTeams ?? null,
        dto.price ?? null,
        dto.rules ?? null,
        dto.prizes ?? null,
      ],
    );
    return result.rows[0];
  }

  async list() {
    const result = await this.db.query(
      `SELECT * FROM tournaments ORDER BY created_at DESC LIMIT 50`,
    );
    return result.rows;
  }

  async getById(id: string) {
    const result = await this.db.query(`SELECT * FROM tournaments WHERE id = $1`, [id]);
    const tournament = result.rows[0];
    if (!tournament) {
      throw new NotFoundException('Torneo no encontrado');
    }

    const photos = await this.db.query(
      `SELECT tp.id, tp.photo_url, tp.caption, tp.created_at, u.id AS uploaded_by_user_id, u.name AS uploaded_by_name
       FROM tournament_photos tp
       INNER JOIN users u ON u.id = tp.uploaded_by_user_id
       WHERE tp.tournament_id = $1
       ORDER BY tp.created_at DESC`,
      [id],
    );

    return {
      ...tournament,
      photos: photos.rows,
    };
  }

  async addPhoto(tournamentId: string, userId: string, dto: CreateTournamentPhotoDto) {
    await this.getById(tournamentId);
    await this.assertOrganizerRole(userId);

    this.validatePhotoPayload(dto.photoUrl);
    const upload = await this.uploadTournamentImage(tournamentId, dto.photoUrl);

    const result = await this.db.query(
      `INSERT INTO tournament_photos (tournament_id, uploaded_by_user_id, photo_url, cloudinary_public_id, caption)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, tournament_id, uploaded_by_user_id, photo_url, cloudinary_public_id, caption, created_at`,
      [tournamentId, userId, upload.secure_url, upload.public_id, dto.caption ?? null],
    );
    return result.rows[0];
  }

  async listPhotos(tournamentId: string) {
    await this.getById(tournamentId);
    const result = await this.db.query(
      `SELECT tp.id, tp.photo_url, tp.caption, tp.created_at, u.id AS uploaded_by_user_id, u.name AS uploaded_by_name
       FROM tournament_photos tp
       INNER JOIN users u ON u.id = tp.uploaded_by_user_id
       WHERE tp.tournament_id = $1
       ORDER BY tp.created_at DESC`,
      [tournamentId],
    );
    return result.rows;
  }

  async deletePhoto(tournamentId: string, photoId: string, userId: string) {
    await this.getById(tournamentId);
    await this.assertOrganizerRole(userId);

    const photoResult = await this.db.query(
      `SELECT id, cloudinary_public_id
       FROM tournament_photos
       WHERE id = $1 AND tournament_id = $2`,
      [photoId, tournamentId],
    );
    const photo = photoResult.rows[0];
    if (!photo) {
      throw new NotFoundException('Foto no encontrada');
    }

    if (photo.cloudinary_public_id) {
      await cloudinary.uploader.destroy(photo.cloudinary_public_id, {
        resource_type: 'image',
      });
    }

    await this.db.query(
      `DELETE FROM tournament_photos WHERE id = $1`,
      [photoId],
    );

    return { success: true };
  }

  private async assertOrganizerRole(userId: string) {
    const result = await this.db.query(
      `SELECT role FROM users WHERE id = $1`,
      [userId],
    );
    const role = result.rows[0]?.role;
    if (!role) {
      throw new ForbiddenException('Usuario inválido');
    }
    if (!['CLUB_ADMIN', 'SUPER_ADMIN'].includes(role)) {
      throw new ForbiddenException('Solo cuentas de organizador pueden realizar esta acción');
    }
  }

  private validatePhotoPayload(photoUrl: string) {
    if (!photoUrl.startsWith('data:image/')) {
      throw new ForbiddenException('Formato de imagen inválido');
    }

    const approxSizeBytes = Math.ceil((photoUrl.length * 3) / 4);
    const maxSizeBytes = 6 * 1024 * 1024;
    if (approxSizeBytes > maxSizeBytes) {
      throw new ForbiddenException('La imagen excede el límite de 6MB');
    }
  }

  private async uploadTournamentImage(tournamentId: string, photoDataUrl: string) {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      throw new ForbiddenException('Cloudinary no está configurado en el servidor');
    }

    return cloudinary.uploader.upload(photoDataUrl, {
      folder: `playtomic-clone/tournaments/${tournamentId}`,
      resource_type: 'image',
      transformation: [{ width: 1600, crop: 'limit' }, { quality: 'auto' }],
    });
  }
}
