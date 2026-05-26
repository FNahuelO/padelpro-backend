import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { isClubRole } from '../common/roles';
import { getMonthKey } from '../common/utils';
import { DatabaseService } from '../database/database.service';
import { CreateClubDto } from './dto/create-club.dto';
import { CreateClubPromotionDto } from './dto/create-club-promotion.dto';
import { CreateClubRewardDto } from './dto/create-club-reward.dto';
import { CreateCourtSlotDto } from './dto/create-court-slot.dto';
import { UpdateClubDto } from './dto/update-club.dto';

@Injectable()
export class ClubsService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    const result = await this.db.query(
      `SELECT id, name, city, zone, address, phone, logo_url, latitude, longitude,
              subscription_plan, created_at
       FROM clubs
       ORDER BY name ASC`,
    );
    return result.rows;
  }

  async findOne(id: string) {
    const result = await this.db.query(
      `SELECT id, name, city, zone, address, phone, logo_url, latitude, longitude,
              subscription_plan, created_at, updated_at
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
    await this.assertClubRole(userId);
    const result = await this.db.query(
      `INSERT INTO clubs (name, city, zone, address, phone, logo_url, latitude, longitude)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, name, city, zone, address, phone, logo_url, latitude, longitude,
                 created_at, updated_at`,
      [
        dto.name,
        dto.city ?? null,
        dto.zone ?? null,
        dto.address ?? null,
        dto.phone ?? null,
        dto.logoUrl ?? null,
        dto.latitude ?? null,
        dto.longitude ?? null,
      ],
    );
    return result.rows[0];
  }

  async update(userId: string, clubId: string, dto: UpdateClubDto) {
    await this.assertClubRole(userId);
    const result = await this.db.query(
      `UPDATE clubs
       SET name = COALESCE($2, name),
           city = COALESCE($3, city),
           zone = COALESCE($4, zone),
           address = COALESCE($5, address),
           phone = COALESCE($6, phone),
           logo_url = COALESCE($7, logo_url),
           subscription_plan = COALESCE($8, subscription_plan),
           latitude = COALESCE($9, latitude),
           longitude = COALESCE($10, longitude),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, city, zone, address, phone, logo_url, latitude, longitude,
                 subscription_plan, created_at, updated_at`,
      [
        clubId,
        dto.name ?? null,
        dto.city ?? null,
        dto.zone ?? null,
        dto.address ?? null,
        dto.phone ?? null,
        dto.logoUrl ?? null,
        dto.subscriptionPlan ?? null,
        dto.latitude ?? null,
        dto.longitude ?? null,
      ],
    );
    const club = result.rows[0];
    if (!club) {
      throw new NotFoundException('Club no encontrado');
    }
    return club;
  }

  async listCourtSlots(clubId: string, userId?: string) {
    await this.findOne(clubId);
    if (userId) {
      await this.assertClubRole(userId);
    }
    const result = await this.db.query(
      `SELECT id, club_id, court_label, slot_date, start_hour, end_hour, status, bonus_points, created_at
       FROM court_availability_slots
       WHERE club_id = $1 AND status <> 'CANCELLED'
       ORDER BY slot_date ASC, start_hour ASC`,
      [clubId],
    );
    return result.rows;
  }

  async createCourtSlot(userId: string, clubId: string, dto: CreateCourtSlotDto) {
    await this.assertClubRole(userId);
    const club = await this.findOne(clubId);

    if (dto.startHour >= dto.endHour) {
      throw new BadRequestException('La hora de fin debe ser posterior a la de inicio');
    }

    const courtLabel = (dto.courtLabel || 'Cancha 1').trim();
    if (!courtLabel) {
      throw new BadRequestException('Indicá el nombre o número de cancha');
    }

    const bonusPoints = await this.resolveSlotBonus(clubId, dto);

    const result = await this.db.query(
      `INSERT INTO court_availability_slots
         (club_id, court_label, slot_date, start_hour, end_hour, created_by_user_id, bonus_points)
       VALUES ($1, $2, $3::date, $4, $5, $6, $7)
       RETURNING id, club_id, court_label, slot_date, start_hour, end_hour, status, bonus_points, created_at`,
      [clubId, courtLabel, dto.slotDate, dto.startHour, dto.endHour, userId, bonusPoints],
    );
    const slot = result.rows[0];

    let notifiedCount = 0;
    if (dto.notifyPlayers !== false) {
      notifiedCount = await this.notifyPlayersAboutSlot(club, slot);
    }

    return { ...slot, notifiedCount };
  }

  async deleteCourtSlot(userId: string, clubId: string, slotId: string) {
    await this.assertClubRole(userId);
    const result = await this.db.query(
      `UPDATE court_availability_slots
       SET status = 'CANCELLED'
       WHERE id = $1 AND club_id = $2
       RETURNING id`,
      [slotId, clubId],
    );
    if (!result.rows[0]) {
      throw new NotFoundException('Horario no encontrado');
    }
    return { ok: true };
  }

  private async notifyPlayersAboutSlot(
    club: { id: string; name: string; city?: string; zone?: string },
    slot: {
      id: string;
      court_label: string;
      slot_date: string;
      start_hour: number;
      end_hour: number;
      bonus_points?: number;
    },
  ): Promise<number> {
    const startLabel = `${String(slot.start_hour).padStart(2, '0')}:00`;
    const endLabel = `${String(slot.end_hour).padStart(2, '0')}:00`;
    const dateLabel = new Date(`${slot.slot_date}T12:00:00`).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });

    const players = await this.db.query<{ id: string }>(
      `SELECT DISTINCT u.id
       FROM users u
       INNER JOIN players p ON p.user_id = u.id
       CROSS JOIN clubs c
       WHERE c.id = $1
         AND u.role = 'PLAYER'
         AND (
           p.city = c.city
           OR (c.zone IS NOT NULL AND p.zone = c.zone)
         )`,
      [club.id],
    );

    const bonus = (slot as { bonus_points?: number }).bonus_points ?? 0;
    const title =
      bonus > 0 ? `Horario con bonus (+${bonus} pts) · ${club.name}` : `Cancha libre en ${club.name}`;
    const body = `${slot.court_label} · ${dateLabel} ${startLabel}–${endLabel}${
      bonus > 0 ? ' · Sumá puntos del club' : ''
    }`;

    for (const player of players.rows) {
      await this.db.query(
        `INSERT INTO notifications (user_id, type, title, body, data)
         VALUES ($1, 'COURT_SLOT_AVAILABLE', $2, $3, $4::jsonb)`,
        [
          player.id,
          title,
          body,
          JSON.stringify({
            clubId: club.id,
            slotId: slot.id,
            slotDate: slot.slot_date,
            startHour: slot.start_hour,
            endHour: slot.end_hour,
          }),
        ],
      );
    }

    return players.rows.length;
  }

  async getDashboard(clubId: string, userId: string) {
    await this.assertClubRole(userId);
    await this.findOne(clubId);

    const [slots, activity, leaderboard] = await Promise.all([
      this.db.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'OPEN' AND slot_date >= CURRENT_DATE)::int AS open_slots,
           COUNT(*) FILTER (WHERE slot_date >= CURRENT_DATE AND slot_date < CURRENT_DATE + 7)::int AS slots_this_week,
           COALESCE(SUM(bonus_points) FILTER (WHERE status = 'OPEN'), 0)::int AS bonus_points_offered
         FROM court_availability_slots
         WHERE club_id = $1 AND status <> 'CANCELLED'`,
        [clubId],
      ),
      this.db.query(
        `SELECT
           COUNT(DISTINCT mp.player_id) FILTER (
             WHERE m.date >= NOW() - INTERVAL '30 days'
           )::int AS unique_players_30d,
           COUNT(DISTINCT m.id) FILTER (
             WHERE m.status = 'FINISHED' AND m.date >= NOW() - INTERVAL '30 days'
           )::int AS matches_finished_30d,
           COUNT(DISTINCT m.id) FILTER (
             WHERE m.status IN ('OPEN','FULL','CONFIRMED','IN_PROGRESS')
               AND m.date >= NOW()
           )::int AS active_matches
         FROM matches m
         LEFT JOIN match_players mp ON mp.match_id = m.id AND mp.status IN ('JOINED','CONFIRMED')
         WHERE m.club_id = $1`,
        [clubId],
      ),
      this.queryMonthlyLeaderboard(clubId, 5),
    ]);

    const uniquePlayers = activity.rows[0]?.unique_players_30d ?? 0;
    const finishedMatches = activity.rows[0]?.matches_finished_30d ?? 0;
    const rotationIndex =
      finishedMatches > 0
        ? Math.min(100, Math.round((uniquePlayers / finishedMatches) * 100))
        : 0;

    return {
      openSlots: slots.rows[0]?.open_slots ?? 0,
      slotsThisWeek: slots.rows[0]?.slots_this_week ?? 0,
      bonusPointsOffered: slots.rows[0]?.bonus_points_offered ?? 0,
      uniquePlayers30d: uniquePlayers,
      matchesFinished30d: finishedMatches,
      activeMatches: activity.rows[0]?.active_matches ?? 0,
      rotationIndex,
      monthKey: getMonthKey(),
      leaderboard,
    };
  }

  async getInternalRanking(clubId: string, userId: string, monthKey?: string) {
    await this.assertClubRole(userId);
    return this.queryMonthlyLeaderboard(clubId, 20, monthKey);
  }

  async getPublicLeaderboard(clubId: string, limit = 20, monthKey?: string) {
    await this.findOne(clubId);
    return this.queryMonthlyLeaderboard(clubId, limit, monthKey);
  }

  async getPublicRewards(clubId: string) {
    await this.findOne(clubId);
    const result = await this.db.query(
      `SELECT id, title, description, points_required, reward_type
       FROM club_reward_catalog
       WHERE club_id = $1 AND active = TRUE
       ORDER BY points_required ASC`,
      [clubId],
    );
    return result.rows;
  }

  async getMyClubPoints(clubId: string, userId: string, monthKey?: string) {
    await this.findOne(clubId);
    const month = monthKey ?? getMonthKey();

    const [wallet, monthly] = await Promise.all([
      this.db.query(
        `SELECT points, matches_at_club, last_played_at
         FROM club_member_points
         WHERE club_id = $1 AND user_id = $2`,
        [clubId, userId],
      ),
      this.db.query(
        `SELECT points, matches_played, updated_at
         FROM club_member_monthly_points
         WHERE club_id = $1 AND user_id = $2 AND month_key = $3`,
        [clubId, userId, month],
      ),
    ]);

    const walletRow = wallet.rows[0];
    const monthlyRow = monthly.rows[0];

    return {
      points: walletRow?.points ?? 0,
      matchesAtClub: walletRow?.matches_at_club ?? 0,
      lastPlayedAt: walletRow?.last_played_at ?? null,
      monthKey: month,
      monthlyPoints: monthlyRow?.points ?? 0,
      monthlyMatchesPlayed: monthlyRow?.matches_played ?? 0,
    };
  }

  async redeemReward(clubId: string, userId: string, rewardId: string) {
    await this.findOne(clubId);

    const rewardResult = await this.db.query(
      `SELECT id, title, points_required FROM club_reward_catalog
       WHERE id = $1 AND club_id = $2 AND active = TRUE`,
      [rewardId, clubId],
    );
    const reward = rewardResult.rows[0];
    if (!reward) {
      throw new NotFoundException('Premio no encontrado');
    }

    const balanceResult = await this.db.query(
      `SELECT points FROM club_member_points WHERE club_id = $1 AND user_id = $2`,
      [clubId, userId],
    );
    const balance = balanceResult.rows[0]?.points ?? 0;
    if (balance < reward.points_required) {
      throw new BadRequestException(
        `Te faltan ${reward.points_required - balance} puntos para canjear este premio`,
      );
    }

    await this.db.query(
      `UPDATE club_member_points
       SET points = points - $3, updated_at = NOW()
       WHERE club_id = $1 AND user_id = $2`,
      [clubId, userId, reward.points_required],
    );

    await this.db.query(
      `INSERT INTO club_points_ledger (club_id, user_id, amount, reason, reference_id)
       VALUES ($1, $2, $3, 'REWARD_REDEEM', $4)`,
      [clubId, userId, -reward.points_required, rewardId],
    );

    await this.db.query(
      `INSERT INTO club_reward_redemptions (club_id, user_id, reward_id, points_spent)
       VALUES ($1, $2, $3, $4)`,
      [clubId, userId, rewardId, reward.points_required],
    );

    await this.db.query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ($1, 'REWARD_REDEEMED', $2, $3, $4::jsonb)`,
      [
        userId,
        'Premio canjeado',
        `Canjeaste "${reward.title}" en el club. Presentate en recepción para retirarlo.`,
        JSON.stringify({ clubId, rewardId }),
      ],
    );

    return {
      ok: true,
      rewardTitle: reward.title,
      pointsSpent: reward.points_required,
      remainingPoints: balance - reward.points_required,
    };
  }

  private async queryMonthlyLeaderboard(clubId: string, limit = 20, monthKey?: string) {
    const month = monthKey ?? getMonthKey();
    const result = await this.db.query(
      `SELECT cmmp.user_id,
              u.name,
              p.nickname,
              p.photo_url,
              cmmp.points,
              cmmp.matches_played AS matches_at_club,
              cmmp.updated_at AS last_played_at,
              cmmp.month_key,
              RANK() OVER (ORDER BY cmmp.points DESC, cmmp.matches_played DESC) AS rank
       FROM club_member_monthly_points cmmp
       INNER JOIN users u ON u.id = cmmp.user_id
       LEFT JOIN players p ON p.user_id = cmmp.user_id
       WHERE cmmp.club_id = $1 AND cmmp.month_key = $2 AND cmmp.points > 0
       ORDER BY cmmp.points DESC, cmmp.matches_played DESC
       LIMIT $3`,
      [clubId, month, limit],
    );
    return result.rows;
  }

  async listPromotions(clubId: string, userId: string) {
    await this.assertClubRole(userId);
    const result = await this.db.query(
      `SELECT id, club_id, label, day_of_week, start_hour, end_hour, bonus_points, active, created_at
       FROM club_promotions
       WHERE club_id = $1
       ORDER BY start_hour ASC`,
      [clubId],
    );
    return result.rows;
  }

  async createPromotion(clubId: string, userId: string, dto: CreateClubPromotionDto) {
    await this.assertClubRole(userId);
    if (dto.startHour >= dto.endHour) {
      throw new BadRequestException('La hora de fin debe ser posterior a la de inicio');
    }

    const result = await this.db.query(
      `INSERT INTO club_promotions (club_id, label, day_of_week, start_hour, end_hour, bonus_points, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        clubId,
        dto.label,
        dto.dayOfWeek ?? null,
        dto.startHour,
        dto.endHour,
        dto.bonusPoints,
        dto.active ?? true,
      ],
    );
    return result.rows[0];
  }

  async deletePromotion(clubId: string, userId: string, promotionId: string) {
    await this.assertClubRole(userId);
    const result = await this.db.query(
      `UPDATE club_promotions SET active = FALSE WHERE id = $1 AND club_id = $2 RETURNING id`,
      [promotionId, clubId],
    );
    if (!result.rows[0]) {
      throw new NotFoundException('Promoción no encontrada');
    }
    return { ok: true };
  }

  async listRewards(clubId: string, userId: string) {
    await this.assertClubRole(userId);
    const result = await this.db.query(
      `SELECT id, club_id, title, description, points_required, reward_type, active, created_at
       FROM club_reward_catalog
       WHERE club_id = $1 AND active = TRUE
       ORDER BY points_required ASC`,
      [clubId],
    );
    return result.rows;
  }

  async createReward(clubId: string, userId: string, dto: CreateClubRewardDto) {
    await this.assertClubRole(userId);
    const result = await this.db.query(
      `INSERT INTO club_reward_catalog (club_id, title, description, points_required, reward_type, active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        clubId,
        dto.title,
        dto.description ?? null,
        dto.pointsRequired,
        dto.rewardType ?? 'BENEFIT',
        dto.active ?? true,
      ],
    );
    return result.rows[0];
  }

  private async resolveSlotBonus(clubId: string, dto: CreateCourtSlotDto): Promise<number> {
    if (dto.bonusPoints != null && dto.bonusPoints > 0) {
      return dto.bonusPoints;
    }

    const slotDate = new Date(`${dto.slotDate}T12:00:00`);
    const dayOfWeek = slotDate.getDay();

    const promo = await this.db.query(
      `SELECT bonus_points FROM club_promotions
       WHERE club_id = $1 AND active = TRUE
         AND start_hour <= $3 AND end_hour >= $4
         AND (day_of_week IS NULL OR day_of_week = $2)
       ORDER BY bonus_points DESC
       LIMIT 1`,
      [clubId, dayOfWeek, dto.startHour, dto.endHour],
    );

    if (promo.rows[0]) {
      return promo.rows[0].bonus_points;
    }

    if (dto.isDeadHour || (dto.startHour >= 10 && dto.endHour <= 16)) {
      return 15;
    }

    return 0;
  }

  private async assertClubRole(userId: string) {
    const result = await this.db.query(`SELECT role FROM users WHERE id = $1`, [userId]);
    const role = result.rows[0]?.role;
    if (!isClubRole(role)) {
      throw new ForbiddenException('Solo cuentas de club pueden gestionar clubes y horarios');
    }
  }
}
