import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { isClubRole } from '../common/roles';
import { getMonthKey } from '../common/utils';
import { COURT_SLOT_END_AT_SQL } from '../common/utils/court-schedule.util';
import { DatabaseService } from '../database/database.service';
import { CreateClubDto } from './dto/create-club.dto';
import { CreateClubPromotionDto } from './dto/create-club-promotion.dto';
import { CreateClubRewardDto } from './dto/create-club-reward.dto';
import { CreateShopCouponDto } from './dto/create-shop-coupon.dto';
import { CreateShopProductDto } from './dto/create-shop-product.dto';
import { UpdateShopProductDto } from './dto/update-shop-product.dto';
import { UpdateClubRewardDto } from './dto/update-club-reward.dto';
import { UpdateShopStockDto } from './dto/update-shop-stock.dto';

type RankingPeriod = 'weekly' | 'monthly' | 'annual';
import { CreateCourtSlotDto } from './dto/create-court-slot.dto';
import { UpdateCourtSlotDto } from './dto/update-court-slot.dto';
import { UpdateClubDto } from './dto/update-club.dto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertClubId(id: string): void {
  if (!id || id === 'undefined' || id === 'null' || !UUID_RE.test(id)) {
    throw new BadRequestException('ID de club inválido');
  }
}

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

  /**
   * Clubs con al menos un turno OPEN que se solapa con la franja pedida.
   */
  async findAvailableForWindow(date: string, startHour: number, endHour: number) {
    if (!date || Number.isNaN(startHour) || Number.isNaN(endHour) || startHour >= endHour) {
      throw new BadRequestException('Fecha y franja horaria inválidas');
    }

    await this.db.query(
      `UPDATE court_availability_slots
       SET status = 'CANCELLED'
       WHERE status = 'OPEN' AND ${COURT_SLOT_END_AT_SQL} < NOW()`,
    );

    const result = await this.db.query(
      `SELECT c.id,
              c.name,
              c.city,
              c.zone,
              c.address,
              cas.id AS slot_id,
              cas.court_label,
              cas.start_hour,
              cas.end_hour,
              cas.bonus_points
       FROM clubs c
       INNER JOIN court_availability_slots cas ON cas.club_id = c.id
       WHERE cas.status = 'OPEN'
         AND cas.slot_date = $1::date
         AND cas.start_hour < $3
         AND cas.end_hour > $2
       ORDER BY c.name ASC, cas.start_hour ASC, cas.court_label ASC`,
      [date, startHour, endHour],
    );

    const byClub = new Map<
      string,
      {
        id: string;
        name: string;
        city?: string;
        zone?: string;
        address?: string;
        openSlots: number;
        slots: {
          id: string;
          courtLabel: string;
          startHour: number;
          endHour: number;
          bonusPoints: number;
        }[];
      }
    >();

    for (const row of result.rows) {
      let club = byClub.get(row.id);
      if (!club) {
        club = {
          id: row.id,
          name: row.name,
          city: row.city ?? undefined,
          zone: row.zone ?? undefined,
          address: row.address ?? undefined,
          openSlots: 0,
          slots: [],
        };
        byClub.set(row.id, club);
      }
      club.openSlots += 1;
      club.slots.push({
        id: row.slot_id,
        courtLabel: row.court_label,
        startHour: Number(row.start_hour),
        endHour: Number(row.end_hour),
        bonusPoints: Number(row.bonus_points ?? 0),
      });
    }

    return Array.from(byClub.values());
  }

  async findOne(id: string) {
    assertClubId(id);
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
    await this.db.query(
      `UPDATE court_availability_slots
       SET status = 'CANCELLED'
       WHERE club_id = $1 AND status = 'OPEN' AND ${COURT_SLOT_END_AT_SQL} < NOW()`,
      [clubId],
    );
    const result = await this.db.query(
      `SELECT id, club_id, court_label, slot_date, start_hour, end_hour, status, bonus_points, created_at
       FROM court_availability_slots
       WHERE club_id = $1 AND status <> 'CANCELLED'
       ORDER BY slot_date ASC, start_hour ASC`,
      [clubId],
    );
    return result.rows;
  }

  async listClubMatches(clubId: string, userId: string) {
    await this.assertClubRole(userId);
    await this.findOne(clubId);
    const result = await this.db.query(
      `SELECT m.id,
              m.title,
              m.date,
              m.status,
              m.needed_players,
              (
                (SELECT COUNT(*)::int FROM match_players mp WHERE mp.match_id = m.id AND mp.status IN ('JOINED','CONFIRMED'))
                +
                (SELECT COUNT(*)::int FROM match_guests mg WHERE mg.match_id = m.id)
              ) AS joined_count
       FROM matches m
       WHERE m.club_id = $1
         AND m.status NOT IN ('CANCELLED', 'FINISHED')
         AND m.date >= NOW() - INTERVAL '12 hours'
       ORDER BY m.date ASC
       LIMIT 40`,
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

  async updateCourtSlot(userId: string, clubId: string, slotId: string, dto: UpdateCourtSlotDto) {
    await this.assertClubRole(userId);
    const existing = await this.db.query(
      `SELECT id, court_label, slot_date, start_hour, end_hour
       FROM court_availability_slots
       WHERE id = $1 AND club_id = $2 AND status <> 'CANCELLED'`,
      [slotId, clubId],
    );
    const row = existing.rows[0];
    if (!row) {
      throw new NotFoundException('Horario no encontrado');
    }

    const courtLabel = (dto.courtLabel ?? row.court_label).trim();
    const slotDate = dto.slotDate ?? row.slot_date;
    const startHour = dto.startHour ?? Number(row.start_hour);
    const endHour = dto.endHour ?? Number(row.end_hour);

    if (!courtLabel) {
      throw new BadRequestException('Indicá el nombre o número de cancha');
    }
    if (startHour >= endHour) {
      throw new BadRequestException('La hora de fin debe ser posterior a la de inicio');
    }

    const bonusPoints = await this.resolveSlotBonus(clubId, {
      courtLabel,
      slotDate: typeof slotDate === 'string' ? slotDate.slice(0, 10) : slotDate,
      startHour,
      endHour,
      isDeadHour: dto.isDeadHour,
    });

    const result = await this.db.query(
      `UPDATE court_availability_slots
       SET court_label = $3,
           slot_date = $4::date,
           start_hour = $5,
           end_hour = $6,
           bonus_points = $7
       WHERE id = $1 AND club_id = $2
       RETURNING id, club_id, court_label, slot_date, start_hour, end_hour, status, bonus_points, created_at`,
      [slotId, clubId, courtLabel, slotDate, startHour, endHour, bonusPoints],
    );
    return result.rows[0];
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
    const startLabel = this.formatHourLabel(slot.start_hour);
    const endLabel = this.formatHourLabel(slot.end_hour);
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

  async getClubImpact(clubId: string, userId: string) {
    await this.assertClubRole(userId);
    await this.findOne(clubId);

    const monthKey = getMonthKey();
    const monthStart = `${monthKey}-01`;

    const [revenue, newPlayers, activity] = await Promise.all([
      this.db.query(
        `SELECT
           COALESCE((
             SELECT SUM(md.amount)
             FROM match_deposits md
             INNER JOIN matches m ON m.id = md.match_id
             WHERE m.club_id = $1
               AND md.status = 'APPROVED'
               AND COALESCE(md.paid_at, md.updated_at) >= $2::date
           ), 0)::float8 AS deposits,
           COALESCE((
             SELECT SUM(sp.subtotal)
             FROM shop_purchases sp
             WHERE sp.club_id = $1
               AND sp.status = 'CONFIRMED'
               AND sp.created_at >= $2::date
           ), 0)::float8 AS shop`,
        [clubId, monthStart],
      ),
      this.db.query(
        `SELECT COUNT(DISTINCT p.user_id)::int AS count
         FROM match_players mp
         INNER JOIN players p ON p.id = mp.player_id
         INNER JOIN matches m ON m.id = mp.match_id
         WHERE m.club_id = $1
           AND m.status = 'FINISHED'
           AND m.date >= $2::date
           AND mp.status IN ('JOINED', 'CONFIRMED')
           AND NOT EXISTS (
             SELECT 1
             FROM match_players mp2
             INNER JOIN matches m2 ON m2.id = mp2.match_id
             WHERE mp2.player_id = mp.player_id
               AND m2.club_id = $1
               AND m2.status = 'FINISHED'
               AND m2.date < $2::date
               AND mp2.status IN ('JOINED', 'CONFIRMED')
           )`,
        [clubId, monthStart],
      ),
      this.db.query(
        `SELECT
           COUNT(DISTINCT m.id) FILTER (
             WHERE m.status = 'FINISHED' AND m.date >= $2::date
           )::int AS matches_finished,
           COUNT(DISTINCT mp.player_id) FILTER (
             WHERE m.status = 'FINISHED'
               AND m.date >= $2::date
               AND mp.status IN ('JOINED', 'CONFIRMED')
           )::int AS active_players
         FROM matches m
         LEFT JOIN match_players mp ON mp.match_id = m.id
         WHERE m.club_id = $1`,
        [clubId, monthStart],
      ),
    ]);

    const collectedDeposits = Number(revenue.rows[0]?.deposits ?? 0);
    const collectedShop = Number(revenue.rows[0]?.shop ?? 0);

    return {
      monthKey,
      revenueCollected: collectedDeposits + collectedShop,
      revenueDeposits: collectedDeposits,
      revenueShop: collectedShop,
      newPlayers: newPlayers.rows[0]?.count ?? 0,
      matchesFinished: activity.rows[0]?.matches_finished ?? 0,
      activePlayers: activity.rows[0]?.active_players ?? 0,
    };
  }

  async getInternalRanking(
    clubId: string,
    userId: string,
    period: RankingPeriod = 'monthly',
    monthKey?: string,
    limit = 20,
  ) {
    await this.assertClubRole(userId);
    const safeLimit = Math.min(50, Math.max(5, limit));
    if (period === 'monthly') {
      return this.queryMonthlyLeaderboard(clubId, safeLimit, monthKey);
    }
    return this.queryPeriodLeaderboard(clubId, period, safeLimit);
  }

  async getRevenue(clubId: string, userId: string, periodDays = 30, movementsLimit = 15) {
    await this.assertClubRole(userId);
    await this.findOne(clubId);

    const days = Math.min(365, Math.max(0, periodDays));
    const periodFilter = days > 0 ? `>= NOW() - ($2::int * INTERVAL '1 day')` : 'IS NOT NULL';
    const periodParams = days > 0 ? [clubId, days] : [clubId];
    const safeMovementsLimit = Math.min(1000, Math.max(1, movementsLimit));

    const [deposits, pendingDeposits, shop, pendingShop, recentDeposits, recentShop] = await Promise.all([
      this.db.query(
        `SELECT COALESCE(SUM(md.amount), 0)::float8 AS total, COUNT(*)::int AS count
         FROM match_deposits md
         INNER JOIN matches m ON m.id = md.match_id
         WHERE m.club_id = $1 AND md.status = 'APPROVED'
           AND COALESCE(md.paid_at, md.updated_at) ${periodFilter}`,
        periodParams,
      ),
      this.db.query(
        `SELECT COALESCE(SUM(md.amount), 0)::float8 AS total, COUNT(*)::int AS count
         FROM match_deposits md
         INNER JOIN matches m ON m.id = md.match_id
         WHERE m.club_id = $1 AND md.status = 'PENDING'
           AND md.created_at ${periodFilter}`,
        periodParams,
      ),
      this.db.query(
        `SELECT COALESCE(SUM(sp.subtotal), 0)::float8 AS total, COUNT(*)::int AS count
         FROM shop_purchases sp
         WHERE sp.club_id = $1 AND sp.status = 'CONFIRMED'
           AND sp.created_at ${periodFilter}`,
        periodParams,
      ),
      this.db.query(
        `SELECT COALESCE(SUM(sp.subtotal), 0)::float8 AS total, COUNT(*)::int AS count
         FROM shop_purchases sp
         WHERE sp.club_id = $1 AND sp.status = 'PENDING'
           AND sp.created_at ${periodFilter}`,
        periodParams,
      ),
      this.db.query(
        `SELECT md.id,
                md.amount,
                md.status,
                COALESCE(md.paid_at, md.updated_at) AS occurred_at,
                u.name AS user_name,
                m.title AS match_title
         FROM match_deposits md
         INNER JOIN matches m ON m.id = md.match_id
         INNER JOIN users u ON u.id = md.user_id
         WHERE m.club_id = $1 AND md.status IN ('APPROVED', 'PENDING')
           AND COALESCE(md.paid_at, md.updated_at) ${periodFilter}
         ORDER BY occurred_at DESC
         LIMIT $${periodParams.length + 1}`,
        [...periodParams, safeMovementsLimit],
      ),
      this.db.query(
        `SELECT sp.id,
                sp.subtotal AS amount,
                sp.status,
                sp.created_at AS occurred_at,
                u.name AS user_name,
                p.name AS product_name,
                m.title AS match_title
         FROM shop_purchases sp
         INNER JOIN club_shop_products p ON p.id = sp.product_id
         INNER JOIN users u ON u.id = sp.user_id
         LEFT JOIN matches m ON m.id = sp.match_id
         WHERE sp.club_id = $1 AND sp.status <> 'CANCELLED'
           AND sp.created_at ${periodFilter}
         ORDER BY sp.created_at DESC
         LIMIT $${periodParams.length + 1}`,
        [...periodParams, safeMovementsLimit],
      ),
    ]);

    const collectedDeposits = Number(deposits.rows[0]?.total ?? 0);
    const collectedShop = Number(shop.rows[0]?.total ?? 0);
    const pendingDepositsTotal = Number(pendingDeposits.rows[0]?.total ?? 0);
    const pendingShopTotal = Number(pendingShop.rows[0]?.total ?? 0);

    const recent = [
      ...recentDeposits.rows.map((row) => ({
        id: row.id,
        kind: 'deposit' as const,
        label: row.match_title ? `Seña · ${row.match_title}` : 'Seña de cancha',
        userName: row.user_name,
        amount: Number(row.amount),
        status: row.status,
        occurredAt: row.occurred_at,
      })),
      ...recentShop.rows.map((row) => ({
        id: row.id,
        kind: 'shop' as const,
        label: row.product_name,
        userName: row.user_name,
        amount: Number(row.amount),
        status: row.status,
        occurredAt: row.occurred_at,
      })),
    ]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, safeMovementsLimit);

    return {
      periodDays: days,
      monthKey: getMonthKey(),
      summary: {
        collectedDeposits,
        collectedShop,
        totalCollected: collectedDeposits + collectedShop,
        pendingDeposits: pendingDepositsTotal,
        pendingShop: pendingShopTotal,
        totalPending: pendingDepositsTotal + pendingShopTotal,
        depositCount: deposits.rows[0]?.count ?? 0,
        shopSaleCount: shop.rows[0]?.count ?? 0,
      },
      recent,
    };
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

  private async queryPeriodLeaderboard(clubId: string, period: RankingPeriod, limit = 20) {
    if (period === 'weekly') {
      const result = await this.db.query(
        `SELECT cpl.user_id,
                u.name,
                p.nickname,
                p.photo_url,
                SUM(cpl.amount)::int AS points,
                COUNT(*) FILTER (WHERE cpl.amount > 0)::int AS matches_at_club,
                RANK() OVER (ORDER BY SUM(cpl.amount) DESC) AS rank
         FROM club_points_ledger cpl
         INNER JOIN users u ON u.id = cpl.user_id
         LEFT JOIN players p ON p.user_id = cpl.user_id
         WHERE cpl.club_id = $1
           AND cpl.created_at >= NOW() - INTERVAL '7 days'
           AND cpl.amount > 0
         GROUP BY cpl.user_id, u.name, p.nickname, p.photo_url
         HAVING SUM(cpl.amount) > 0
         ORDER BY points DESC, matches_at_club DESC
         LIMIT $2`,
        [clubId, limit],
      );
      return result.rows;
    }

    const year = new Date().getFullYear().toString();
    const result = await this.db.query(
      `SELECT cmmp.user_id,
              u.name,
              p.nickname,
              p.photo_url,
              SUM(cmmp.points)::int AS points,
              SUM(cmmp.matches_played)::int AS matches_at_club,
              RANK() OVER (ORDER BY SUM(cmmp.points) DESC) AS rank
       FROM club_member_monthly_points cmmp
       INNER JOIN users u ON u.id = cmmp.user_id
       LEFT JOIN players p ON p.user_id = cmmp.user_id
       WHERE cmmp.club_id = $1 AND cmmp.month_key LIKE $2 AND cmmp.points > 0
       GROUP BY cmmp.user_id, u.name, p.nickname, p.photo_url
       ORDER BY points DESC, matches_at_club DESC
       LIMIT $3`,
      [clubId, `${year}-%`, limit],
    );
    return result.rows;
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
        dto.bonusPoints ?? 0,
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

  async updateReward(clubId: string, userId: string, rewardId: string, dto: UpdateClubRewardDto) {
    await this.assertClubRole(userId);
    const result = await this.db.query(
      `UPDATE club_reward_catalog
       SET title = COALESCE($3, title),
           description = COALESCE($4, description),
           points_required = COALESCE($5, points_required),
           reward_type = COALESCE($6, reward_type),
           active = COALESCE($7, active)
       WHERE id = $1 AND club_id = $2
       RETURNING id, club_id, title, description, points_required, reward_type, active, created_at`,
      [
        rewardId,
        clubId,
        dto.title ?? null,
        dto.description ?? null,
        dto.pointsRequired ?? null,
        dto.rewardType ?? null,
        dto.active ?? null,
      ],
    );
    if (!result.rows[0]) {
      throw new NotFoundException('Premio no encontrado');
    }
    return result.rows[0];
  }

  async listRewardRedemptions(clubId: string, userId: string, limit = 50) {
    await this.assertClubRole(userId);
    const safeLimit = Math.min(100, Math.max(5, limit));
    const result = await this.db.query(
      `SELECT r.id,
              r.points_spent,
              r.created_at,
              u.name AS user_name,
              p.nickname AS user_nickname,
              rc.title AS reward_title
       FROM club_reward_redemptions r
       INNER JOIN users u ON u.id = r.user_id
       LEFT JOIN players p ON p.user_id = r.user_id
       INNER JOIN club_reward_catalog rc ON rc.id = r.reward_id
       WHERE r.club_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2`,
      [clubId, safeLimit],
    );
    return result.rows;
  }

  async listShopProducts(clubId: string, options: { matchExtraOnly?: boolean } = {}) {
    await this.findOne(clubId);
    const params: Array<string | boolean> = [clubId];
    let extraFilter = '';
    if (options.matchExtraOnly) {
      extraFilter = 'AND available_as_match_extra = TRUE';
    }
    const result = await this.db.query(
      `SELECT id, name, description, price, kind, category, stock_quantity, available_as_match_extra
       FROM club_shop_products
       WHERE club_id = $1 AND active = TRUE ${extraFilter}
       ORDER BY name ASC`,
      params,
    );
    return result.rows;
  }

  async listShopProductsManage(clubId: string, userId: string) {
    await this.assertClubRole(userId);
    await this.findOne(clubId);
    const result = await this.db.query(
      `SELECT id, name, description, price, kind, category, stock_quantity, available_as_match_extra, active, created_at
       FROM club_shop_products
       WHERE club_id = $1
       ORDER BY active DESC, name ASC`,
      [clubId],
    );
    return result.rows;
  }

  async createShopProduct(clubId: string, userId: string, dto: CreateShopProductDto) {
    await this.assertClubRole(userId);
    await this.findOne(clubId);
    const kind = dto.kind ?? 'GENERAL';
    const matchExtra =
      dto.availableAsMatchExtra ?? (kind === 'MATCH_ADDON');
    const result = await this.db.query(
      `INSERT INTO club_shop_products
         (club_id, name, description, price, kind, category, stock_quantity, available_as_match_extra, active)
       VALUES ($1, $2, $3, $4, 'GENERAL', $5, $6, $7, TRUE)
       RETURNING id, name, description, price, kind, category, stock_quantity, available_as_match_extra, active, created_at`,
      [
        clubId,
        dto.name.trim(),
        dto.description?.trim() || null,
        dto.price,
        dto.category ?? 'OTHER',
        dto.stockQuantity ?? null,
        matchExtra,
      ],
    );
    return result.rows[0];
  }

  async updateShopProduct(
    clubId: string,
    userId: string,
    productId: string,
    dto: UpdateShopProductDto,
  ) {
    await this.assertClubRole(userId);
    await this.findOne(clubId);

    if (dto.name !== undefined && !dto.name.trim()) {
      throw new BadRequestException('El nombre no puede estar vacío');
    }

    const result = await this.db.query(
      `UPDATE club_shop_products
       SET name = COALESCE($3, name),
           description = CASE WHEN $4::text IS NOT NULL THEN NULLIF(TRIM($4), '') ELSE description END,
           price = COALESCE($5, price),
           kind = COALESCE($6, kind),
           category = COALESCE($7, category),
           stock_quantity = COALESCE($8, stock_quantity),
           active = COALESCE($9, active),
           available_as_match_extra = COALESCE($10, available_as_match_extra),
           updated_at = NOW()
       WHERE id = $1 AND club_id = $2
       RETURNING id, name, description, price, kind, category, stock_quantity, available_as_match_extra, active, created_at`,
      [
        productId,
        clubId,
        dto.name?.trim() ?? null,
        dto.description !== undefined ? dto.description : null,
        dto.price ?? null,
        dto.kind ?? null,
        dto.category ?? null,
        dto.stockQuantity ?? null,
        dto.active ?? null,
        dto.availableAsMatchExtra ?? null,
      ],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('Producto no encontrado');
    }
    return result.rows[0];
  }

  async updateShopProductStock(
    clubId: string,
    userId: string,
    productId: string,
    dto: UpdateShopStockDto,
  ) {
    await this.assertClubRole(userId);
    const result = await this.db.query(
      `UPDATE club_shop_products
       SET stock_quantity = $3
       WHERE id = $1 AND club_id = $2
       RETURNING id, name, stock_quantity, active`,
      [productId, clubId, dto.stockQuantity],
    );
    if (!result.rows[0]) {
      throw new NotFoundException('Producto no encontrado');
    }
    return result.rows[0];
  }

  async deactivateShopProduct(clubId: string, userId: string, productId: string) {
    await this.assertClubRole(userId);
    const result = await this.db.query(
      `UPDATE club_shop_products SET active = FALSE WHERE id = $1 AND club_id = $2 RETURNING id`,
      [productId, clubId],
    );
    if (!result.rows[0]) {
      throw new NotFoundException('Producto no encontrado');
    }
    return { ok: true };
  }

  async listShopSales(clubId: string, userId: string) {
    await this.assertClubRole(userId);
    const result = await this.db.query(
      `SELECT sp.id,
              sp.quantity,
              sp.subtotal,
              sp.status,
              sp.created_at,
              p.name AS product_name,
              u.name AS user_name,
              m.title AS match_title
       FROM shop_purchases sp
       INNER JOIN club_shop_products p ON p.id = sp.product_id
       INNER JOIN users u ON u.id = sp.user_id
       LEFT JOIN matches m ON m.id = sp.match_id
       WHERE sp.club_id = $1
       ORDER BY sp.created_at DESC
       LIMIT 50`,
      [clubId],
    );
    return result.rows;
  }

  async listShopCoupons(clubId: string, userId: string) {
    await this.assertClubRole(userId);
    const result = await this.db.query(
      `SELECT id, code, label, discount_percent, discount_amount, points_cost,
              max_uses, uses_count, active, expires_at, created_at
       FROM club_shop_coupons
       WHERE club_id = $1
       ORDER BY active DESC, created_at DESC`,
      [clubId],
    );
    return result.rows;
  }

  async createShopCoupon(clubId: string, userId: string, dto: CreateShopCouponDto) {
    await this.assertClubRole(userId);
    const code = dto.code.trim().toUpperCase();
    if (!code) {
      throw new BadRequestException('Indicá un código de cupón');
    }
    const result = await this.db.query(
      `INSERT INTO club_shop_coupons
         (club_id, code, label, discount_percent, discount_amount, points_cost, max_uses, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
       RETURNING *`,
      [
        clubId,
        code,
        dto.label.trim(),
        dto.discountPercent ?? null,
        dto.discountAmount ?? null,
        dto.pointsCost ?? null,
        dto.maxUses ?? null,
      ],
    );
    return result.rows[0];
  }

  async deactivateShopCoupon(clubId: string, userId: string, couponId: string) {
    await this.assertClubRole(userId);
    const result = await this.db.query(
      `UPDATE club_shop_coupons SET active = FALSE WHERE id = $1 AND club_id = $2 RETURNING id`,
      [couponId, clubId],
    );
    if (!result.rows[0]) {
      throw new NotFoundException('Cupón no encontrado');
    }
    return { ok: true };
  }

  private async resolveSlotBonus(_clubId: string, _dto: CreateCourtSlotDto): Promise<number> {
    return 0;
  }

  private formatHourLabel(hour: number): string {
    const totalMinutes = Math.round(Number(hour) * 60);
    if (totalMinutes >= 24 * 60) return '00:00';
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private async assertClubRole(userId: string) {
    const result = await this.db.query(`SELECT role FROM users WHERE id = $1`, [userId]);
    const role = result.rows[0]?.role;
    if (!isClubRole(role)) {
      throw new ForbiddenException('Solo cuentas de club pueden gestionar clubes y horarios');
    }
  }
}
