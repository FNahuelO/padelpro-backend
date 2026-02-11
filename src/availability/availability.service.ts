import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async setAvailability(
    userId: string,
    availabilities: Array<{
      dayOfWeek: number;
      startHour: number;
      endHour: number;
      clubId?: string;
    }>,
  ) {
    // Validar que no haya solapamientos entre los slots enviados
    this.validateNoOverlaps(availabilities);

    // Transacción: eliminar existentes y crear nuevos
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.availability.deleteMany({
        where: { userId },
      });

      if (availabilities.length === 0) {
        return [];
      }

      await tx.availability.createMany({
        data: availabilities.map((av) => ({
          ...av,
          userId,
        })),
      });

      return tx.availability.findMany({
        where: { userId },
        orderBy: [{ dayOfWeek: 'asc' }, { startHour: 'asc' }],
        include: { club: { select: { id: true, name: true } } },
      });
    });

    return result;
  }

  async getMyAvailability(userId: string) {
    return this.prisma.availability.findMany({
      where: { userId },
      orderBy: [{ dayOfWeek: 'asc' }, { startHour: 'asc' }],
      include: { club: { select: { id: true, name: true } } },
    });
  }

  async deleteSlot(userId: string, slotId: string) {
    const slot = await this.prisma.availability.findFirst({
      where: { id: slotId, userId },
    });

    if (!slot) {
      throw new NotFoundException('Horario no encontrado');
    }

    await this.prisma.availability.delete({
      where: { id: slotId },
    });

    return { message: 'Horario eliminado' };
  }

  async updateSlot(
    userId: string,
    slotId: string,
    data: { dayOfWeek?: number; startHour?: number; endHour?: number },
  ) {
    const slot = await this.prisma.availability.findFirst({
      where: { id: slotId, userId },
    });

    if (!slot) {
      throw new NotFoundException('Horario no encontrado');
    }

    const updatedStartHour = data.startHour ?? slot.startHour;
    const updatedEndHour = data.endHour ?? slot.endHour;

    if (updatedStartHour >= updatedEndHour) {
      throw new BadRequestException(
        'La hora de inicio debe ser anterior a la hora de fin',
      );
    }

    // Verificar solapamiento con otros slots del mismo día
    const updatedDay = data.dayOfWeek ?? slot.dayOfWeek;
    const overlapping = await this.prisma.availability.findFirst({
      where: {
        userId,
        id: { not: slotId },
        dayOfWeek: updatedDay,
        startHour: { lt: updatedEndHour },
        endHour: { gt: updatedStartHour },
      },
    });

    if (overlapping) {
      throw new BadRequestException(
        'El horario se solapa con otro ya existente',
      );
    }

    return this.prisma.availability.update({
      where: { id: slotId },
      data,
    });
  }

  async addSlot(
    userId: string,
    slot: { dayOfWeek: number; startHour: number; endHour: number; clubId?: string },
  ) {
    if (slot.startHour >= slot.endHour) {
      throw new BadRequestException(
        'La hora de inicio debe ser anterior a la hora de fin',
      );
    }

    // Verificar solapamiento
    const overlapping = await this.prisma.availability.findFirst({
      where: {
        userId,
        dayOfWeek: slot.dayOfWeek,
        startHour: { lt: slot.endHour },
        endHour: { gt: slot.startHour },
      },
    });

    if (overlapping) {
      throw new BadRequestException(
        'El horario se solapa con otro ya existente',
      );
    }

    return this.prisma.availability.create({
      data: { ...slot, userId },
    });
  }

  async findAvailableUsers(params: {
    date: Date;
    startHour: number;
    endHour: number;
    clubId?: string;
    minRating?: number;
    maxRating?: number;
    excludeUserIds?: string[];
  }) {
    const dayOfWeek = params.date.getDay();

    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          {
            availabilities: {
              some: {
                dayOfWeek,
                startHour: { lte: params.startHour },
                endHour: { gte: params.endHour },
                ...(params.clubId ? { clubId: params.clubId } : {}),
              },
            },
          },
          params.minRating ? { rating: { gte: params.minRating } } : {},
          params.maxRating ? { rating: { lte: params.maxRating } } : {},
          params.excludeUserIds?.length
            ? { id: { notIn: params.excludeUserIds } }
            : {},
        ],
      },
      select: {
        id: true,
        name: true,
        rating: true,
        photo: true,
      },
    });

    return users;
  }

  // ─── Helpers ───

  private validateNoOverlaps(
    slots: Array<{ dayOfWeek: number; startHour: number; endHour: number }>,
  ) {
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        if (
          slots[i].dayOfWeek === slots[j].dayOfWeek &&
          slots[i].startHour < slots[j].endHour &&
          slots[j].startHour < slots[i].endHour
        ) {
          throw new BadRequestException(
            `Los horarios del ${this.getDayName(slots[i].dayOfWeek)} se solapan`,
          );
        }
      }
    }
  }

  private getDayName(day: number): string {
    const days = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
    ];
    return days[day] || `día ${day}`;
  }
}
