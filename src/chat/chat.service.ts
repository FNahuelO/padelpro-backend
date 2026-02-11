import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getMatchMessages(matchId: string, userId: string) {
    // Verificar que el usuario es participante y el match está CONFIRMED o COMPLETED
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        participants: {
          where: { userId },
        },
      },
    });

    if (!match || match.participants.length === 0) {
      throw new ForbiddenException('No tenés acceso a este chat');
    }

    if (!['CONFIRMED', 'COMPLETED'].includes(match.status)) {
      throw new BadRequestException('El chat solo está disponible para partidos confirmados');
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
    // Verificar que el usuario es participante y el match está CONFIRMED o COMPLETED
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        participants: {
          where: { userId },
        },
      },
    });

    if (!match || match.participants.length === 0) {
      throw new ForbiddenException('No tenés acceso a este chat');
    }

    if (!['CONFIRMED', 'COMPLETED'].includes(match.status)) {
      throw new BadRequestException('El chat solo está disponible para partidos confirmados');
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

  /**
   * Verificar si un match tiene chat habilitado (solo CONFIRMED/COMPLETED).
   */
  async isChatEnabled(matchId: string): Promise<boolean> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { status: true },
    });

    return match ? ['CONFIRMED', 'COMPLETED'].includes(match.status) : false;
  }
}
