import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: any;
  }) {
    return this.prisma.notification.create({ data });
  }

  async createMany(notifications: Array<{
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: any;
  }>) {
    return this.prisma.notification.createMany({ data: notifications });
  }

  async getMyNotifications(userId: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, read: false },
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  // ── Helpers para crear notificaciones específicas ──

  async notifyMatchInvite(userId: string, matchId: string, clubName?: string) {
    return this.create({
      userId,
      type: 'MATCH_INVITE',
      title: '🎾 Nuevo partido disponible',
      body: clubName
        ? `Te invitaron a un partido en ${clubName}`
        : 'Te invitaron a un partido',
      data: { matchId },
    });
  }

  async notifyMatchConfirmed(userId: string, matchId: string) {
    return this.create({
      userId,
      type: 'MATCH_CONFIRMED',
      title: '✅ Partido confirmado',
      body: '¡Todos los jugadores aceptaron! El partido está confirmado.',
      data: { matchId },
    });
  }

  async notifyRankingOvertaken(userId: string, overtakerName: string, clubName: string) {
    return this.create({
      userId,
      type: 'RANKING_OVERTAKEN',
      title: '📊 Te superaron en el ranking',
      body: `${overtakerName} te superó en el ranking de ${clubName}`,
    });
  }

  async notifyWeeklyWinner(userId: string, clubName: string, weekKey: string) {
    return this.create({
      userId,
      type: 'RANKING_WEEKLY_WINNER',
      title: '🏆 ¡Ganaste el ranking semanal!',
      body: `Sos el N°1 de ${clubName} esta semana`,
      data: { weekKey },
    });
  }

  async notifyFriendRequest(userId: string, fromUserName: string) {
    return this.create({
      userId,
      type: 'FRIEND_REQUEST',
      title: '👋 Solicitud de amistad',
      body: `${fromUserName} quiere ser tu amigo`,
    });
  }
}

