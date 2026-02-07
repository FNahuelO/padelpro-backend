import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { ClubsService } from '../clubs/clubs.service';
import { MatchesService } from '../matches/matches.service';

@Injectable()
export class MatchmakingService {
  constructor(
    private prisma: PrismaService,
    private availabilityService: AvailabilityService,
    private clubsService: ClubsService,
    private matchesService: MatchesService,
  ) {}

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

  async runMatchmaking(matchRequestId: string) {
    const matchRequest = await this.prisma.matchRequest.findUnique({
      where: { id: matchRequestId },
      include: { user: true },
    });

    if (!matchRequest) {
      throw new NotFoundException('MatchRequest no encontrado');
    }

    if (matchRequest.status !== 'PENDING') {
      throw new BadRequestException('MatchRequest ya procesado');
    }

    // Buscar usuarios disponibles
    const availableUsers = await this.availabilityService.findAvailableUsers({
      date: matchRequest.date,
      startHour: matchRequest.startHour,
      endHour: matchRequest.endHour,
      minRating: matchRequest.minRating || undefined,
      maxRating: matchRequest.maxRating || undefined,
      excludeUserIds: [matchRequest.userId],
    });

    if (availableUsers.length < 3) {
      throw new BadRequestException('No hay suficientes jugadores disponibles');
    }

    // Seleccionar 3 jugadores (el creador + 3 = 4 total)
    const selectedUsers = availableUsers.slice(0, 3);
    const allUsers = [matchRequest.user, ...selectedUsers];

    // Calcular bonus points si aplica
    let bonusPoints = 0;
    if (matchRequest.clubId) {
      const club = await this.clubsService.findOne(matchRequest.clubId);
      const hour = matchRequest.startHour;
      const dayOfWeek = matchRequest.date.getDay();

      const promotion = club.promotions?.find(
        (p) =>
          p.dayOfWeek === dayOfWeek &&
          p.startHour <= hour &&
          p.endHour >= hour &&
          p.active,
      );

      if (promotion) {
        bonusPoints = promotion.bonusPoints;
      } else if (hour >= 10 && hour < 16) {
        // Horario valle básico
        bonusPoints = 10;
      }
    }

    // Crear el match
    const match = await this.matchesService.createMatch({
      clubId: matchRequest.clubId || null,
      date: matchRequest.date,
      startHour: matchRequest.startHour,
      endHour: matchRequest.endHour,
      participants: allUsers.map((u, index) => ({
        userId: u.id,
        team: index < 2 ? 'A' : 'B',
        isCaptain: index === 0,
      })),
      bonusPointsApplied: bonusPoints,
    });

    // Marcar matchRequest como MATCHED
    await this.prisma.matchRequest.update({
      where: { id: matchRequestId },
      data: { status: 'MATCHED' },
    });

    return match;
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

