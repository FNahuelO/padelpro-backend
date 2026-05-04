import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { v2 as cloudinary } from 'cloudinary';

type Extras = Record<string, unknown>;

type MatchRow = {
  matchId: string;
  date: Date;
  score: string;
  outcome: 'win' | 'loss' | 'draw';
  opponentNames: string[];
};

function levelToRating(level: number | null | undefined): number {
  const l = level != null ? Number(level) : 2.5;
  return Math.round(1000 + (l - 2.5) * 80);
}

function parseScore(score: string): { a: number; b: number } | null {
  const parts = score.split(/[-:]/).map((s) => parseInt(s.trim(), 10));
  if (parts.length >= 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
    return { a: parts[0], b: parts[1] };
  }
  return null;
}

function userTeamFromRank(rnk: number, neededPlayers: number): 'A' | 'B' {
  const half = Math.ceil(Math.max(neededPlayers, 2) / 2);
  return rnk <= half ? 'A' : 'B';
}

function tallyWL(rows: MatchRow[]) {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  for (const m of rows) {
    const pts = parseScore(m.score);
    if (pts && pts.a === pts.b) draws += 1;
    else if (m.outcome === 'win') wins += 1;
    else if (m.outcome === 'loss') losses += 1;
  }
  return { wins, losses, draws };
}

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  private parseExtras(row: { extras?: unknown } | undefined): Extras {
    const raw = row?.extras;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return raw as Extras;
    }
    return {};
  }

  async getProfile(userId: string) {
    const res = await this.db.query(
      `SELECT u.id, u.name, u.email, u.role,
              p.id AS player_id, p.photo_url, p.city, p.zone, p.level, p.position, p.bio, p.nickname,
              p.extras
       FROM users u
       LEFT JOIN players p ON p.user_id = u.id
       WHERE u.id = $1`,
      [userId],
    );
    const row = res.rows[0];
    if (!row) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const extras = this.parseExtras(row);
    const prefs = (extras.preferences as Extras) || {};

    const matchRows = await this.loadMatchRowsForUser(userId);
    const wl = tallyWL(matchRows);

    const mainClubId = (extras.mainClubId as string) || undefined;
    let mainClub: { id: string; name: string; zone?: string } | undefined;
    if (mainClubId) {
      const c = await this.db.query(
        `SELECT id, name, zone FROM clubs WHERE id = $1`,
        [mainClubId],
      );
      if (c.rows[0]) {
        mainClub = {
          id: c.rows[0].id,
          name: c.rows[0].name,
          zone: c.rows[0].zone ?? undefined,
        };
      }
    }

    const location =
      (extras.location as string) ||
      [row.zone, row.city].filter(Boolean).join(', ') ||
      undefined;

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: (extras.phone as string) || '',
      gender: (extras.gender as string) || '',
      birthDate: (extras.birthDate as string) || undefined,
      description: row.bio || '',
      photo: row.photo_url ?? undefined,
      location,
      rating: levelToRating(row.level),
      levelCategory: row.level != null ? String(row.level) : '2.5',
      mainClubId,
      mainClub,
      weeklyRankPosition: null,
      sports: ['Pádel'],
      stats: {
        matches: matchRows.length,
        wins: wl.wins,
        losses: wl.losses,
      },
      preferences: {
        preferredHand: (prefs.preferredHand as string) || mapPosition(row.position),
        courtPosition: (prefs.courtPosition as string) || undefined,
        matchType: (prefs.matchType as string) || undefined,
        preferredPlayTime: (prefs.preferredPlayTime as string) || undefined,
      },
    };
  }

  async getMatchHistory(userId: string, limit?: number) {
    const rows = await this.loadMatchRowsForUser(userId);
    const ordered = [...rows].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    let slice = ordered;
    if (limit && limit > 0) {
      slice = ordered.slice(-limit);
    }

    const levelRes = await this.db.query(`SELECT level FROM players WHERE user_id = $1`, [
      userId,
    ]);
    const baseRating = levelToRating(levelRes.rows[0]?.level);

    const sumDelta = slice.reduce((acc, m) => {
      const pts = parseScore(m.score);
      const draw = pts != null && pts.a === pts.b;
      const ch = draw ? 0 : m.outcome === 'win' ? 12 : m.outcome === 'loss' ? -10 : 0;
      return acc + ch;
    }, 0);

    let r = baseRating - sumDelta;
    const historyOut = slice.map((m) => {
      const pts = parseScore(m.score);
      const draw = pts != null && pts.a === pts.b;
      let result: 'win' | 'loss' | 'draw' = 'draw';
      if (!draw) {
        result = m.outcome === 'win' ? 'win' : 'loss';
      }
      const ratingChange = draw ? 0 : result === 'win' ? 12 : -10;
      r += ratingChange;
      return {
        matchId: m.matchId,
        date: new Date(m.date).toISOString(),
        result,
        score: m.score,
        ratingChange,
        ratingAfter: r,
        opponent: m.opponentNames,
      };
    });

    const wl = tallyWL(ordered);

    return {
      currentRating: baseRating,
      totalMatches: ordered.length,
      wins: wl.wins,
      losses: wl.losses,
      draws: wl.draws,
      history: historyOut,
    };
  }

  private async loadMatchRowsForUser(userId: string): Promise<MatchRow[]> {
    const res = await this.db.query(
      `WITH base AS (
         SELECT m.id AS match_id, m.date, m.needed_players, mr.score, mr.winner_team
         FROM matches m
         INNER JOIN match_results mr ON mr.match_id = m.id
         INNER JOIN match_players my_mp ON my_mp.match_id = m.id
         INNER JOIN players my_p ON my_p.id = my_mp.player_id AND my_p.user_id = $1
         WHERE m.status = 'FINISHED' AND my_mp.status IN ('JOINED','CONFIRMED')
       ),
       numbered AS (
         SELECT b.match_id, b.date, b.needed_players, b.score, b.winner_team,
                pl.user_id AS uid, u.name AS player_name,
                ROW_NUMBER() OVER (PARTITION BY mp.match_id ORDER BY mp.created_at) AS rnk
         FROM base b
         INNER JOIN match_players mp ON mp.match_id = b.match_id
           AND mp.status IN ('JOINED','CONFIRMED')
         INNER JOIN players pl ON pl.id = mp.player_id
         INNER JOIN users u ON u.id = pl.user_id
       )
       SELECT * FROM numbered
       ORDER BY date ASC, match_id, rnk`,
      [userId],
    );

    const byMatch = new Map<
      string,
      {
        matchId: string;
        date: Date;
        score: string;
        winnerTeam: string;
        neededPlayers: number;
        players: { userId: string; name: string; rnk: number }[];
      }
    >();

    for (const row of res.rows) {
      const id = row.match_id;
      if (!byMatch.has(id)) {
        byMatch.set(id, {
          matchId: id,
          date: row.date,
          score: row.score,
          winnerTeam: String(row.winner_team || '').toUpperCase(),
          neededPlayers: Number(row.needed_players) || 4,
          players: [],
        });
      }
      byMatch.get(id)!.players.push({
        userId: row.uid,
        name: row.player_name,
        rnk: Number(row.rnk),
      });
    }

    const out: MatchRow[] = [];

    for (const m of byMatch.values()) {
      const me = m.players.find((p) => p.userId === userId);
      if (!me) continue;
      const myTeam = userTeamFromRank(me.rnk, m.neededPlayers);
      const pts = parseScore(m.score);
      const draw = pts != null && pts.a === pts.b;
      let outcome: 'win' | 'loss' | 'draw' = 'draw';
      if (!draw) {
        const w = m.winnerTeam === 'A' || m.winnerTeam === 'B' ? m.winnerTeam : 'A';
        outcome = myTeam === w ? 'win' : 'loss';
      }
      const opponentNames = m.players
        .filter((p) => p.userId !== userId)
        .map((p) => p.name);
      out.push({
        matchId: m.matchId,
        date: m.date,
        score: m.score,
        outcome,
        opponentNames,
      });
    }

    return out;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.name) {
      await this.db.query(`UPDATE users SET name = $2, updated_at = NOW() WHERE id = $1`, [
        userId,
        dto.name,
      ]);
    }

    const ures = await this.db.query(`SELECT id, bio, city, extras FROM players WHERE user_id = $1`, [
      userId,
    ]);
    const prow = ures.rows[0];
    if (!prow) {
      return this.getProfile(userId);
    }

    const extras = this.parseExtras(prow);
    if (dto.phone !== undefined) extras.phone = dto.phone;
    if (dto.gender !== undefined) extras.gender = dto.gender;
    if (dto.birthDate !== undefined) extras.birthDate = dto.birthDate;
    if (dto.mainClubId !== undefined) extras.mainClubId = dto.mainClubId;
    if (dto.location !== undefined) extras.location = dto.location;

    const bio = dto.description !== undefined ? dto.description : prow.bio;
    const city = dto.location !== undefined ? dto.location : prow.city;

    await this.db.query(
      `UPDATE players
       SET bio = $2,
           city = $3,
           extras = $4::jsonb,
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId, bio, city, JSON.stringify(extras)],
    );

    return this.getProfile(userId);
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const ures = await this.db.query(`SELECT id, extras FROM players WHERE user_id = $1`, [
      userId,
    ]);
    const row = ures.rows[0];
    if (!row) {
      throw new NotFoundException('Perfil de jugador no encontrado');
    }

    const extras = this.parseExtras(row);
    const preferences: Extras = { ...(extras.preferences as Extras), ...dto };
    extras.preferences = preferences;

    await this.db.query(`UPDATE players SET extras = $2::jsonb, updated_at = NOW() WHERE id = $1`, [
      row.id,
      JSON.stringify(extras),
    ]);

    return {
      preferredHand: dto.preferredHand ?? (preferences.preferredHand as string) ?? null,
      courtPosition: dto.courtPosition ?? (preferences.courtPosition as string) ?? null,
      matchType: dto.matchType ?? (preferences.matchType as string) ?? null,
      preferredPlayTime: dto.preferredPlayTime ?? (preferences.preferredPlayTime as string) ?? null,
    };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      throw new BadRequestException('Cloudinary no está configurado');
    }

    const b64 = file.buffer.toString('base64');
    const dataUri = `data:${file.mimetype};base64,${b64}`;

    const upload = await cloudinary.uploader.upload(dataUri, {
      folder: `playtomic-clone/avatars/${userId}`,
      resource_type: 'image',
      transformation: [{ width: 800, crop: 'limit' }, { quality: 'auto' }],
    });

    await this.db.query(
      `UPDATE players SET photo_url = $2, updated_at = NOW() WHERE user_id = $1`,
      [userId, upload.secure_url],
    );

    return { photo: upload.secure_url };
  }
}

function mapPosition(
  pos: string | null | undefined,
): string | undefined {
  if (!pos) return undefined;
  const m: Record<string, string> = {
    drive: 'Drive',
    reves: 'Revés',
    ambos: 'Ambos',
  };
  return m[pos] ?? pos;
}
