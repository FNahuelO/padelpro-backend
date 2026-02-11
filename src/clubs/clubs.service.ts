import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClubsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.club.findMany({
      where: { isActive: true },
      include: {
        promotions: {
          where: { active: true },
        },
        prizes: {
          where: { isActive: true },
        },
        _count: {
          select: { courts: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const club = await this.prisma.club.findUnique({
      where: { id },
      include: {
        courts: true,
        promotions: {
          where: { active: true },
        },
        prizes: {
          where: { isActive: true },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!club) {
      throw new NotFoundException('Club no encontrado');
    }

    return club;
  }

  async getPromotions(clubId: string) {
    return this.prisma.clubPromotion.findMany({
      where: {
        clubId,
        active: true,
      },
      orderBy: { priority: 'desc' },
    });
  }
}

