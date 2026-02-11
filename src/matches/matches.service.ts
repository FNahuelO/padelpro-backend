import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { getWeekKey, getWeekStart, getLevelCategory } from '../common/utils';

@Injectable()
export class MatchesService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

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
        club: {
          select: { id: true, name: true, address: true, zone: true },
        },
        result: true,
      },
    });

    if (!match) {
      throw new NotFoundException('Partido no encontrado');
    }

    return {
      ...match,
      participants: match.participants.map((p) => ({
        ...p,
        user: {
          ...p.user,
          levelCategory: getLevelCategory(p.user.rating),
        },
      })),
    };
  }

  async getMyMatches(userId: string) {
    const matches = await this.prisma.match.findMany({
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
        club: {
          select: { id: true, name: true, address: true },
        },
        result: true,
      },
      orderBy: { date: 'desc' },
    });

    return matches.map((match) => ({
      ...match,
      participants: match.participants.map((p) => ({
        ...p,
        user: {
          ...p.user,
          levelCategory: getLevelCategory(p.user.rating),
        },
      })),
    }));
  }

  /**
   * Aceptar invitación a un partido (PROPOSED/PENDING).
   * Si todos aceptan → status = CONFIRMED.
   */
  async acceptMatch(matchId: string, userId: string) {
    const match = await this.findOne(matchId);

    if (!['PROPOSED', 'PENDING'].includes(match.status)) {
      throw new BadRequestException('Este partido no acepta confirmaciones');
    }

    const participant = match.participants.find((p) => p.userId === userId);
    if (!participant) {
      throw new BadRequestException('No sos participante de este partido');
    }

    if (participant.status === 'ACCEPTED') {
      throw new BadRequestException('Ya aceptaste este partido');
    }

    if (participant.status === 'DECLINED') {
      throw new BadRequestException('Ya rechazaste este partido');
    }

    await this.prisma.matchParticipant.update({
      where: { id: participant.id },
      data: {
        status: 'ACCEPTED',
        confirmedAt: new Date(),
      },
    });

    // Verificar si todos aceptaron
    const updatedMatch = await this.findOne(matchId);
    const allAccepted = updatedMatch.participants.every(
      (p) => p.status === 'ACCEPTED',
    );

    if (allAccepted) {
      await this.prisma.match.update({
        where: { id: matchId },
        data: { status: 'CONFIRMED' },
      });

      return this.findOne(matchId);
    }

    return updatedMatch;
  }

  /**
   * Rechazar invitación. MVP: si alguien rechaza, se cancela el partido.
   */
  async declineMatch(matchId: string, userId: string) {
    const match = await this.findOne(matchId);

    if (!['PROPOSED', 'PENDING'].includes(match.status)) {
      throw new BadRequestException('Este partido no puede ser rechazado');
    }

    const participant = match.participants.find((p) => p.userId === userId);
    if (!participant) {
      throw new BadRequestException('No sos participante de este partido');
    }

    if (participant.status === 'DECLINED') {
      throw new BadRequestException('Ya rechazaste este partido');
    }

    // Marcar como declined
    await this.prisma.matchParticipant.update({
      where: { id: participant.id },
      data: { status: 'DECLINED' },
    });

    // MVP: si alguien rechaza, cancelar el partido
    await this.prisma.match.update({
      where: { id: matchId },
      data: { status: 'CANCELED' },
    });

    return this.findOne(matchId);
  }

  /**
   * Confirmar asistencia (legacy, mantener compatibilidad).
   * Ahora redirige a acceptMatch.
   */
  async confirmMatch(matchId: string, userId: string) {
    return this.acceptMatch(matchId, userId);
  }

  /**
   * Cargar resultado del partido.
   */
  async submitResult(matchId: string, userId: string, data: {
    teamAScore: number;
    teamBScore: number;
  }) {
    const match = await this.findOne(matchId);

    if (match.status !== 'CONFIRMED') {
      throw new BadRequestException('El partido debe estar confirmado para cargar resultado');
    }

    if (match.result) {
      throw new BadRequestException('El resultado ya fue cargado');
    }

    const participant = match.participants.find((p) => p.userId === userId);
    if (!participant) {
      throw new BadRequestException('No sos participante de este partido');
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

    // Actualizar ratings con Elo
    await this.updateRatings(match, data.teamAScore, data.teamBScore);

    // Marcar match como COMPLETED
    await this.prisma.match.update({
      where: { id: matchId },
      data: { status: 'COMPLETED' },
    });

    // Otorgar puntos base por partido jugado + bonus
    await this.awardMatchPoints(match);

    return this.findOne(matchId);
  }

  /**
   * Algoritmo Elo básico para actualizar ratings.
   */
  private async updateRatings(
    match: any,
    teamAScore: number,
    teamBScore: number,
  ) {
    const teamA = match.participants.filter((p: any) => p.team === 'A');
    const teamB = match.participants.filter((p: any) => p.team === 'B');

    const avgRatingA =
      teamA.reduce((sum: number, p: any) => sum + p.user.rating, 0) / (teamA.length || 1);
    const avgRatingB =
      teamB.reduce((sum: number, p: any) => sum + p.user.rating, 0) / (teamB.length || 1);

    const expectedA = 1 / (1 + Math.pow(10, (avgRatingB - avgRatingA) / 400));
    const expectedB = 1 / (1 + Math.pow(10, (avgRatingA - avgRatingB) / 400));

    const K = 24;
    const actualA = teamAScore > teamBScore ? 1 : teamAScore < teamBScore ? 0 : 0.5;
    const actualB = teamBScore > teamAScore ? 1 : teamBScore < teamAScore ? 0 : 0.5;

    const changeA = K * (actualA - expectedA);
    const changeB = K * (actualB - expectedB);

    for (const p of teamA) {
      const newRating = Math.max(0, Math.round(p.user.rating + changeA));
      await this.usersService.updateRating(p.userId, newRating);
    }

    for (const p of teamB) {
      const newRating = Math.max(0, Math.round(p.user.rating + changeB));
      await this.usersService.updateRating(p.userId, newRating);
    }
  }

  /**
   * Otorgar puntos base + bonus por partido completado.
   * Crea PointsEvent y actualiza WeeklyPoints.
   */
  private async awardMatchPoints(match: any) {
    const weekKey = getWeekKey(match.date);
    const weekStart = getWeekStart(match.date);
    const BASE_POINTS = 10;

    for (const p of match.participants) {
      // Puntos base por jugar
      await this.prisma.pointsEvent.create({
        data: {
          playerId: p.userId,
          clubId: match.clubId,
          matchId: match.id,
          type: 'PLAYED_MATCH',
          points: BASE_POINTS,
          weekKey,
        },
      });

      let totalPoints = BASE_POINTS;

      // Bonus por horario valle
      if (match.bonusPointsApplied > 0) {
        await this.prisma.pointsEvent.create({
          data: {
            playerId: p.userId,
            clubId: match.clubId,
            matchId: match.id,
            type: 'VALLEY_BONUS',
            points: match.bonusPointsApplied,
            weekKey,
          },
        });
        totalPoints += match.bonusPointsApplied;
      }

      // Actualizar WeeklyPoints
      await this.upsertWeeklyPoints(p.userId, match.clubId, weekStart, weekKey, totalPoints);

      // Actualizar puntos acumulados del usuario
      await this.usersService.addWeeklyPoints(p.userId, totalPoints);
    }
  }

  private async upsertWeeklyPoints(
    userId: string,
    clubId: string | null,
    weekStart: Date,
    weekKey: string,
    points: number,
  ) {
    const uniqueKey = {
      userId,
      clubId: clubId || null,
      weekStartDate: weekStart,
    };

    const existing = await this.prisma.weeklyPoints.findUnique({
      where: { userId_clubId_weekStartDate: uniqueKey },
    });

    if (existing) {
      await this.prisma.weeklyPoints.update({
        where: { userId_clubId_weekStartDate: uniqueKey },
        data: {
          points: { increment: points },
          weekKey,
        },
      });
    } else {
      await this.prisma.weeklyPoints.create({
        data: {
          userId,
          clubId: clubId || null,
          weekStartDate: weekStart,
          weekKey,
          points,
        },
      });
    }
  }
}
