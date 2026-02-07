import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FriendsService {
  constructor(private prisma: PrismaService) {}

  async sendFriendRequest(fromUserId: string, toUserId: string) {
    if (fromUserId === toUserId) {
      throw new BadRequestException('No puedes agregarte a ti mismo');
    }

    const existing = await this.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { fromUserId, toUserId },
          { fromUserId: toUserId, toUserId: fromUserId },
        ],
      },
    });

    if (existing) {
      throw new BadRequestException('Ya existe una solicitud de amistad');
    }

    return this.prisma.friendRequest.create({
      data: {
        fromUserId,
        toUserId,
      },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            photo: true,
          },
        },
        toUser: {
          select: {
            id: true,
            name: true,
            photo: true,
          },
        },
      },
    });
  }

  async acceptFriendRequest(requestId: string, userId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    if (request.toUserId !== userId) {
      throw new BadRequestException('No puedes aceptar esta solicitud');
    }

    return this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            photo: true,
          },
        },
        toUser: {
          select: {
            id: true,
            name: true,
            photo: true,
          },
        },
      },
    });
  }

  async rejectFriendRequest(requestId: string, userId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    if (request.toUserId !== userId) {
      throw new BadRequestException('No puedes rechazar esta solicitud');
    }

    return this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });
  }

  async deleteFriend(friendId: string, userId: string) {
    const request = await this.prisma.friendRequest.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { fromUserId: userId, toUserId: friendId },
          { fromUserId: friendId, toUserId: userId },
        ],
      },
    });

    if (!request) {
      throw new NotFoundException('Amistad no encontrada');
    }

    await this.prisma.friendRequest.delete({
      where: { id: request.id },
    });

    return { message: 'Amigo eliminado' };
  }

  async getFriends(userId: string) {
    const requests = await this.prisma.friendRequest.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [
          { fromUserId: userId },
          { toUserId: userId },
        ],
      },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            photo: true,
            rating: true,
          },
        },
        toUser: {
          select: {
            id: true,
            name: true,
            photo: true,
            rating: true,
          },
        },
      },
    });

    return requests.map((r) =>
      r.fromUserId === userId ? r.toUser : r.fromUser,
    );
  }

  async getPendingRequests(userId: string) {
    return this.prisma.friendRequest.findMany({
      where: {
        toUserId: userId,
        status: 'PENDING',
      },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            photo: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

