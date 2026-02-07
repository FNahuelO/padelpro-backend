import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class MatchesService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  async createMatch(data: {
    clubId?: string | null;
    date: Date;
    startHour: number;
    endHour: number;
    participants: Array<{
      userId: string;
      team: 'A' | 'B';
      isCaptain: boolean;
    }>;
    bonusPointsApplied: number;
  }) {
    const match = await this.prisma.match.create({
      data: {
        clubId: data.clubId,
        date: data.date,
        startHour: data.startHour,
        endHour: data.endHour,
        bonusPointsApplied: data.bonusPointsApplied,
        participants: {
          create: data.participants.map((p) => ({
            userId: p.userId,
            team: p.team,
            isCaptain: p.isCaptain,
          })),
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                photo: true,
                rating: true,
              },
            },
          },
        },
        club: true,
      },
    });

    return match;
  }

  async findOne(id: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                photo: true,
                rating: true,
              },
            },
          },
        },
        club: true,
        result: true,
      },
    });

    if (!match) {
      throw new NotFoundException('Match no encontrado');
    }

    return match;
  }

  async getMyMatches(userId: string) {
    return this.prisma.match.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                photo: true,
                rating: true,
              },
            },
          },
        },
        club: true,
        result: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async confirmMatch(matchId: string, userId: string) {
    const match = await this.findOne(matchId);

    const participant = match.participants.find((p) => p.userId === userId);
    if (!participant) {
      throw new BadRequestException('No eres participante de este match');
    }

    if (participant.confirmedAt) {
      throw new BadRequestException('Ya confirmaste este match');
    }

    await this.prisma.matchParticipant.update({
      where: { id: participant.id },
      data: { confirmedAt: new Date() },
    });

    // Verificar si todos confirmaron
    const updatedMatch = await this.findOne(matchId);
    const allConfirmed = updatedMatch.participants.every(
      (p) => p.confirmedAt !== null,
    );

    if (allConfirmed && updatedMatch.status === 'PENDING') {
      await this.prisma.match.update({
        where: { id: matchId },
        data: { status: 'CONFIRMED' },
      });

      // Aplicar bonus points
      if (updatedMatch.bonusPointsApplied > 0) {
        const weekStart = this.getWeekStart(new Date());
        for (const p of updatedMatch.participants) {
          await this.addWeeklyPoints(
            p.userId,
            updatedMatch.bonusPointsApplied,
            updatedMatch.clubId || undefined,
            weekStart,
          );
        }
      }
    }

    return this.findOne(matchId);
  }

  async submitResult(matchId: string, userId: string, data: {
    teamAScore: number;
    teamBScore: number;
  }) {
    const match = await this.findOne(matchId);

    if (match.status !== 'CONFIRMED') {
      throw new BadRequestException('El match debe estar confirmado');
    }

    if (match.result) {
      throw new BadRequestException('El resultado ya fue cargado');
    }

    const participant = match.participants.find((p) => p.userId === userId);
    if (!participant) {
      throw new BadRequestException('No eres participante de este match');
    }

    // Crear resultado
    await this.prisma.matchResult.create({
      data: {
        matchId,
        teamAScore: data.teamAScore,
        teamBScore: data.teamBScore,
        submittedBy: userId,
      },
    });

    // Actualizar rating con algoritmo Elo
    await this.updateRatings(match, data.teamAScore, data.teamBScore);

    // Marcar match como COMPLETED
    await this.prisma.match.update({
      where: { id: matchId },
      data: { status: 'COMPLETED' },
    });

    return this.findOne(matchId);
  }

  private async updateRatings(
    match: any,
    teamAScore: number,
    teamBScore: number,
  ) {
    const teamA = match.participants.filter((p: any) => p.team === 'A');
    const teamB = match.participants.filter((p: any) => p.team === 'B');

    const avgRatingA =
      teamA.reduce((sum: number, p: any) => sum + p.user.rating, 0) / 2;
    const avgRatingB =
      teamB.reduce((sum: number, p: any) => sum + p.user.rating, 0) / 2;

    const expectedA = 1 / (1 + Math.pow(10, (avgRatingB - avgRatingA) / 400));
    const expectedB = 1 / (1 + Math.pow(10, (avgRatingA - avgRatingB) / 400));

    const K = 24;
    const actualA = teamAScore > teamBScore ? 1 : teamAScore < teamBScore ? 0 : 0.5;
    const actualB = teamBScore > teamAScore ? 1 : teamBScore < teamAScore ? 0 : 0.5;

    const changeA = K * (actualA - expectedA);
    const changeB = K * (actualB - expectedB);

    // Actualizar ratings individuales
    for (const p of teamA) {
      const newRating = Math.round(p.user.rating + changeA);
      await this.usersService.updateRating(p.userId, newRating);
    }

    for (const p of teamB) {
      const newRating = Math.round(p.user.rating + changeB);
      await this.usersService.updateRating(p.userId, newRating);
    }
  }

  private async addWeeklyPoints(
    userId: string,
    points: number,
    clubId: string | undefined,
    weekStart: Date,
  ) {
    // Actualizar puntos semanales del usuario
    await this.usersService.addWeeklyPoints(userId, points);

    // Guardar registro de weekly points
    const uniqueKey = {
      userId,
      clubId: clubId || null,
      weekStartDate: weekStart,
    };

    const existing = await this.prisma.weeklyPoints.findUnique({
      where: {
        userId_clubId_weekStartDate: uniqueKey,
      },
    });

    if (existing) {
      await this.prisma.weeklyPoints.update({
        where: {
          userId_clubId_weekStartDate: uniqueKey,
        },
        data: {
          points: {
            increment: points,
          },
        },
      });
    } else {
      await this.prisma.weeklyPoints.create({
        data: {
          userId,
          clubId: clubId || null,
          weekStartDate: weekStart,
          points,
        },
      });
    }
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }
}

