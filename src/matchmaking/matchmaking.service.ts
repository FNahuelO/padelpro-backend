import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { getLevelCategory, getCategoryRatingRange } from '../common/utils';

@Injectable()
export class MatchmakingService {
  constructor(
    private prisma: PrismaService,
    private availabilityService: AvailabilityService,
  ) {}

  /**
   * Crear un MatchRequest (solicitud de partido).
   */
  async createMatchRequest(userId: string, data: {
    clubId?: string;
    date: Date;
    startHour: number;
    endHour: number;
    minRating?: number;
    maxRating?: number;
    category?: string;
  }) {
    return this.prisma.matchRequest.create({
      data: {
        ...data,
        userId,
        date: new Date(data.date),
      },
    });
  }

  /**
   * MVP Matchmaking:
   * 1. Buscar candidatos con disponibilidad compatible
   * 2. Filtrar por rating/categoría
   * 3. Armar propuesta de 4 jugadores
   * 4. Crear Match con status=PROPOSED y participantes con status=INVITED
   * 5. El creador ya tiene status=ACCEPTED automáticamente
   */
  async runMatchmaking(matchRequestId: string, userId: string) {
    const matchRequest = await this.prisma.matchRequest.findUnique({
      where: { id: matchRequestId },
      include: { user: { select: { id: true, name: true, rating: true, photo: true } } },
    });

    if (!matchRequest) {
      throw new NotFoundException('Solicitud de partido no encontrada');
    }

    if (matchRequest.userId !== userId) {
      throw new BadRequestException('No podés ejecutar matchmaking de otro usuario');
    }

    if (matchRequest.status !== 'PENDING') {
      throw new BadRequestException('Esta solicitud ya fue procesada');
    }

    // Determinar filtros de rating
    let minRating = matchRequest.minRating ?? undefined;
    let maxRating = matchRequest.maxRating ?? undefined;

    // Si se especificó categoría, usar rangos de esa categoría
    if (matchRequest.category && !minRating && !maxRating) {
      const range = getCategoryRatingRange(matchRequest.category);
      minRating = range.min;
      maxRating = range.max;
    }

    // Buscar usuarios disponibles
    const availableUsers = await this.availabilityService.findAvailableUsers({
      date: matchRequest.date,
      startHour: matchRequest.startHour,
      endHour: matchRequest.endHour,
      clubId: matchRequest.clubId || undefined,
      minRating,
      maxRating,
      excludeUserIds: [matchRequest.userId],
    });

    if (availableUsers.length < 3) {
      throw new BadRequestException(
        `No hay suficientes jugadores disponibles (encontrados: ${availableUsers.length}, necesarios: 3)`,
      );
    }

    // Ordenar candidatos por cercanía de rating al creador
    const creatorRating = matchRequest.user.rating;
    const sorted = [...availableUsers].sort(
      (a, b) => Math.abs(a.rating - creatorRating) - Math.abs(b.rating - creatorRating),
    );

    // Seleccionar los 3 más cercanos
    const selectedUsers = sorted.slice(0, 3);

    // Calcular bonus points por horario valle
    let bonusPoints = 0;
    if (matchRequest.clubId) {
      const dayOfWeek = matchRequest.date.getDay();
      const hour = matchRequest.startHour;

      const promotion = await this.prisma.clubPromotion.findFirst({
        where: {
          clubId: matchRequest.clubId,
          dayOfWeek,
          startHour: { lte: hour },
          endHour: { gte: hour },
          active: true,
        },
      });

      if (promotion) {
        bonusPoints = promotion.bonusPoints;
      } else if (hour >= 10 && hour < 16) {
        // Horario valle básico si no hay promoción específica
        bonusPoints = 10;
      }
    }

    // Crear Match con status=PROPOSED
    const allParticipants = [
      { userId: matchRequest.userId, team: 'A' as const, isCaptain: true, status: 'ACCEPTED' as const },
      { userId: selectedUsers[0].id, team: 'A' as const, isCaptain: false, status: 'INVITED' as const },
      { userId: selectedUsers[1].id, team: 'B' as const, isCaptain: false, status: 'INVITED' as const },
      { userId: selectedUsers[2].id, team: 'B' as const, isCaptain: false, status: 'INVITED' as const },
    ];

    const match = await this.prisma.match.create({
      data: {
        clubId: matchRequest.clubId,
        date: matchRequest.date,
        startHour: matchRequest.startHour,
        endHour: matchRequest.endHour,
        status: 'PROPOSED',
        bonusPointsApplied: bonusPoints,
        participants: {
          create: allParticipants.map((p) => ({
            userId: p.userId,
            team: p.team,
            isCaptain: p.isCaptain,
            status: p.status,
            ...(p.status === 'ACCEPTED' ? { confirmedAt: new Date() } : {}),
          })),
        },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, rating: true, photo: true } },
          },
        },
        club: { select: { id: true, name: true, address: true } },
      },
    });

    // Marcar matchRequest como MATCHED
    await this.prisma.matchRequest.update({
      where: { id: matchRequestId },
      data: { status: 'MATCHED' },
    });

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

  async getMyMatchRequests(userId: string) {
    return this.prisma.matchRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
}
