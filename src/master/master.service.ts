import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MasterService {
  constructor(private prisma: PrismaService) {}

  async getCurrentMaster() {
    const season = await this.prisma.season.findFirst({
      where: {
        status: 'ACTIVE',
      },
      include: {
        masterEvents: {
          include: {
            participants: {
              include: {
                masterEvent: true,
              },
            },
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    if (!season) {
      return null;
    }

    return season;
  }

  async createSeason(data: {
    name: string;
    startDate: Date;
    endDate: Date;
  }) {
    return this.prisma.season.create({
      data,
    });
  }

  async registerForMaster(seasonId: string, userId1: string, userId2: string) {
    const season = await this.prisma.season.findUnique({
      where: { id: seasonId },
      include: {
        masterEvents: {
          where: { status: 'REGISTRATION' },
        },
      },
    });

    if (!season) {
      throw new NotFoundException('Temporada no encontrada');
    }

    if (season.masterEvents.length === 0) {
      throw new NotFoundException('No hay eventos de Master abiertos');
    }

    const event = season.masterEvents[0];

    return this.prisma.masterParticipant.create({
      data: {
        masterEventId: event.id,
        userId1,
        userId2,
      },
    });
  }
}

