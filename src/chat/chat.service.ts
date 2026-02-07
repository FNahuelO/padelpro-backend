import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getMatchMessages(matchId: string, userId: string) {
    // Verificar que el usuario es participante del match
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        participants: {
          where: { userId },
        },
      },
    });

    if (!match || match.participants.length === 0) {
      throw new ForbiddenException('No tienes acceso a este chat');
    }

    return this.prisma.chatMessage.findMany({
      where: { matchId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            photo: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createMessage(matchId: string, userId: string, content: string) {
    // Verificar que el usuario es participante del match
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        participants: {
          where: { userId },
        },
      },
    });

    if (!match || match.participants.length === 0) {
      throw new ForbiddenException('No tienes acceso a este chat');
    }

    return this.prisma.chatMessage.create({
      data: {
        matchId,
        userId,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            photo: true,
          },
        },
      },
    });
  }
}

