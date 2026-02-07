import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RankingsService {
  constructor(private prisma: PrismaService) {}

  async getWeeklyRanking(clubId?: string, category?: string) {
    // Buscar snapshot más reciente
    const snapshot = await this.prisma.rankingSnapshot.findFirst({
      where: {
        type: 'WEEKLY',
        clubId: clubId || null,
        category: category || null,
      },
      orderBy: { generatedAt: 'desc' },
    });

    if (snapshot && this.isSnapshotRecent(snapshot.generatedAt)) {
      return snapshot.entries as any[];
    }

    // Generar nuevo ranking
    return this.generateWeeklyRanking(clubId, category);
  }

  async getMonthlyRanking(clubId?: string, category?: string) {
    const snapshot = await this.prisma.rankingSnapshot.findFirst({
      where: {
        type: 'MONTHLY',
        clubId: clubId || null,
        category: category || null,
      },
      orderBy: { generatedAt: 'desc' },
    });

    if (snapshot && this.isSnapshotRecent(snapshot.generatedAt, 'monthly')) {
      return snapshot.entries as any[];
    }

    return this.generateMonthlyRanking(clubId, category);
  }

  async getSeasonRanking(seasonId?: string) {
    // Implementación simplificada para Fase 2
    return this.generateSeasonRanking();
  }

  private async generateWeeklyRanking(clubId?: string, category?: string) {
    const weekStart = this.getWeekStart(new Date());

    const users = await this.prisma.user.findMany({
      where: {
        weeklyPointsRecords: clubId
          ? {
              some: {
                clubId,
                weekStartDate: weekStart,
              },
            }
          : {
              some: {
                weekStartDate: weekStart,
              },
            },
      },
      include: {
        weeklyPointsRecords: {
          where: {
            weekStartDate: weekStart,
            ...(clubId ? { clubId } : {}),
          },
        },
      },
      orderBy: { rating: 'desc' },
    });

    const entries = users.map((user, index) => ({
      userId: user.id,
      name: user.name,
      photo: user.photo,
      rating: user.rating,
      points: user.weeklyPointsRecords[0]?.points || 0,
      position: index + 1,
    }));

    // Guardar snapshot
    await this.prisma.rankingSnapshot.create({
      data: {
        type: 'WEEKLY',
        clubId: clubId || null,
        category: category || null,
        entries,
      },
    });

    return entries;
  }

  private async generateMonthlyRanking(clubId?: string, category?: string) {
    const monthStart = this.getMonthStart(new Date());

    const users = await this.prisma.user.findMany({
      where: {},
      orderBy: { monthlyPoints: 'desc' },
    });

    const entries = users.map((user, index) => ({
      userId: user.id,
      name: user.name,
      photo: user.photo,
      rating: user.rating,
      points: user.monthlyPoints,
      position: index + 1,
    }));

    await this.prisma.rankingSnapshot.create({
      data: {
        type: 'MONTHLY',
        clubId: clubId || null,
        category: category || null,
        entries,
      },
    });

    return entries;
  }

  private async generateSeasonRanking() {
    const users = await this.prisma.user.findMany({
      orderBy: { seasonPoints: 'desc' },
      take: 50,
    });

    return users.map((user, index) => ({
      userId: user.id,
      name: user.name,
      photo: user.photo,
      rating: user.rating,
      points: user.seasonPoints,
      position: index + 1,
    }));
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  private getMonthStart(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private isSnapshotRecent(generatedAt: Date, type: 'weekly' | 'monthly' = 'weekly'): boolean {
    const now = new Date();
    const diff = now.getTime() - generatedAt.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (type === 'weekly') {
      return hours < 24; // Actualizar diariamente
    }
    return hours < 24 * 7; // Actualizar semanalmente para mensual
  }
}

