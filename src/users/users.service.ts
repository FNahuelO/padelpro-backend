import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto, UpdatePreferencesDto } from './dto/update-profile.dto';
import { getLevelCategory } from '../common/utils';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    email: string;
    password: string;
    name: string;
    photo?: string;
  }) {
    return this.prisma.user.create({
      data,
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        photo: true,
        phone: true,
        gender: true,
        birthDate: true,
        description: true,
        location: true,
        rating: true,
        mainClubId: true,
        weeklyPoints: true,
        monthlyPoints: true,
        seasonPoints: true,
        sports: true,
        preferredHand: true,
        courtPosition: true,
        matchType: true,
        preferredPlayTime: true,
        createdAt: true,
        mainClub: {
          select: {
            id: true,
            name: true,
            zone: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      ...user,
      levelCategory: getLevelCategory(user.rating),
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        photo: true,
        phone: true,
        gender: true,
        birthDate: true,
        description: true,
        location: true,
        rating: true,
        mainClubId: true,
        weeklyPoints: true,
        monthlyPoints: true,
        seasonPoints: true,
        sports: true,
        preferredHand: true,
        courtPosition: true,
        matchType: true,
        preferredPlayTime: true,
        createdAt: true,
        mainClub: {
          select: {
            id: true,
            name: true,
            zone: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const levelCategory = getLevelCategory(user.rating);

    // Contar partidos del usuario
    const matchesCount = await this.prisma.matchParticipant.count({
      where: { userId },
    });

    // Contar partidos ganados
    const completedMatches = await this.prisma.match.findMany({
      where: {
        status: 'COMPLETED',
        participants: { some: { userId } },
        result: { isNot: null },
      },
      include: {
        participants: {
          where: { userId },
          select: { team: true },
        },
        result: true,
      },
    });

    let wins = 0;
    let losses = 0;
    for (const match of completedMatches) {
      const userTeam = match.participants[0]?.team;
      if (match.result && userTeam) {
        const teamAWon = match.result.teamAScore > match.result.teamBScore;
        const userWon =
          (userTeam === 'A' && teamAWon) || (userTeam === 'B' && !teamAWon);
        if (userWon) wins++;
        else losses++;
      }
    }

    // Posición en ranking semanal de su club principal
    let weeklyRankPosition: number | null = null;
    if (user.mainClubId) {
      const { getWeekKey } = await import('../common/utils');
      const currentWeekKey = getWeekKey();

      const clubPoints = await this.prisma.pointsEvent.groupBy({
        by: ['playerId'],
        where: {
          clubId: user.mainClubId,
          weekKey: currentWeekKey,
        },
        _sum: { points: true },
        orderBy: { _sum: { points: 'desc' } },
      });

      const playerIndex = clubPoints.findIndex((p) => p.playerId === userId);
      if (playerIndex >= 0) {
        weeklyRankPosition = playerIndex + 1;
      }
    }

    return {
      ...user,
      levelCategory,
      weeklyRankPosition,
      stats: {
        matches: matchesCount,
        wins,
        losses,
      },
      preferences: {
        preferredHand: user.preferredHand,
        courtPosition: user.courtPosition,
        matchType: user.matchType,
        preferredPlayTime: user.preferredPlayTime,
      },
    };
  }

  async getMatchHistory(userId: string, limit?: number) {
    const matches = await this.prisma.match.findMany({
      where: {
        status: 'COMPLETED',
        participants: { some: { userId } },
        result: { isNot: null },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, rating: true },
            },
          },
        },
        result: true,
        club: {
          select: { id: true, name: true },
        },
      },
      orderBy: { date: 'asc' },
      ...(limit ? { take: limit } : {}),
    });

    // Calcular evolución de rating basado en los partidos
    // Empezamos con rating 1000 (default) y sumamos/restamos según resultados
    const baseRating = 1000;
    let cumulativeRating = baseRating;
    const K = 24;

    const history = matches.map((match) => {
      const userParticipant = match.participants.find(
        (p) => p.userId === userId,
      );
      const userTeam = userParticipant?.team;

      const teamA = match.participants.filter((p) => p.team === 'A');
      const teamB = match.participants.filter((p) => p.team === 'B');

      const avgRatingA =
        teamA.reduce((sum, p) => sum + p.user.rating, 0) /
        (teamA.length || 1);
      const avgRatingB =
        teamB.reduce((sum, p) => sum + p.user.rating, 0) /
        (teamB.length || 1);

      const teamAWon =
        match.result!.teamAScore > match.result!.teamBScore;
      const userWon =
        (userTeam === 'A' && teamAWon) || (userTeam === 'B' && !teamAWon);
      const isDraw =
        match.result!.teamAScore === match.result!.teamBScore;

      // Calcular cambio Elo
      const userAvgRating = userTeam === 'A' ? avgRatingA : avgRatingB;
      const opponentAvgRating = userTeam === 'A' ? avgRatingB : avgRatingA;
      const expected =
        1 / (1 + Math.pow(10, (opponentAvgRating - userAvgRating) / 400));
      const actual = userWon ? 1 : isDraw ? 0.5 : 0;
      const ratingChange = Math.round(K * (actual - expected));

      cumulativeRating += ratingChange;

      return {
        matchId: match.id,
        date: match.date,
        result: userWon ? 'win' : isDraw ? 'draw' : 'loss',
        score: `${match.result!.teamAScore}-${match.result!.teamBScore}`,
        userTeam,
        ratingChange,
        ratingAfter: cumulativeRating,
        club: match.club,
        opponent: match.participants
          .filter((p) => p.team !== userTeam)
          .map((p) => p.user.name),
      };
    });

    return {
      currentRating:
        history.length > 0
          ? history[history.length - 1].ratingAfter
          : baseRating,
      totalMatches: history.length,
      wins: history.filter((h) => h.result === 'win').length,
      losses: history.filter((h) => h.result === 'loss').length,
      draws: history.filter((h) => h.result === 'draw').length,
      history,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.photo !== undefined && { photo: dto.photo }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.birthDate !== undefined && { birthDate: new Date(dto.birthDate) }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.mainClubId !== undefined && { mainClubId: dto.mainClubId || null }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        photo: true,
        phone: true,
        gender: true,
        birthDate: true,
        description: true,
        location: true,
        rating: true,
        mainClubId: true,
        sports: true,
        preferredHand: true,
        courtPosition: true,
        matchType: true,
        preferredPlayTime: true,
        mainClub: {
          select: { id: true, name: true, zone: true },
        },
      },
    });

    return {
      ...updated,
      levelCategory: getLevelCategory(updated.rating),
    };
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.sports !== undefined && { sports: dto.sports }),
        ...(dto.preferredHand !== undefined && {
          preferredHand: dto.preferredHand,
        }),
        ...(dto.courtPosition !== undefined && {
          courtPosition: dto.courtPosition,
        }),
        ...(dto.matchType !== undefined && { matchType: dto.matchType }),
        ...(dto.preferredPlayTime !== undefined && {
          preferredPlayTime: dto.preferredPlayTime,
        }),
      },
      select: {
        id: true,
        sports: true,
        preferredHand: true,
        courtPosition: true,
        matchType: true,
        preferredPlayTime: true,
      },
    });
  }

  async updateRating(userId: string, newRating: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { rating: newRating },
    });
  }

  async addWeeklyPoints(userId: string, points: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        weeklyPoints: {
          increment: points,
        },
      },
    });
  }
}
