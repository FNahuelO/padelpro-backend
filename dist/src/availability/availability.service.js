"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvailabilityService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AvailabilityService = class AvailabilityService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async setAvailability(userId, availabilities) {
        this.validateNoOverlaps(availabilities);
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
            });
        });
        return result;
    }
    async getMyAvailability(userId) {
        return this.prisma.availability.findMany({
            where: { userId },
            orderBy: [{ dayOfWeek: 'asc' }, { startHour: 'asc' }],
        });
    }
    async deleteSlot(userId, slotId) {
        const slot = await this.prisma.availability.findFirst({
            where: { id: slotId, userId },
        });
        if (!slot) {
            throw new common_1.NotFoundException('Horario no encontrado');
        }
        await this.prisma.availability.delete({
            where: { id: slotId },
        });
        return { message: 'Horario eliminado' };
    }
    async updateSlot(userId, slotId, data) {
        const slot = await this.prisma.availability.findFirst({
            where: { id: slotId, userId },
        });
        if (!slot) {
            throw new common_1.NotFoundException('Horario no encontrado');
        }
        const updatedStartHour = data.startHour ?? slot.startHour;
        const updatedEndHour = data.endHour ?? slot.endHour;
        if (updatedStartHour >= updatedEndHour) {
            throw new common_1.BadRequestException('La hora de inicio debe ser anterior a la hora de fin');
        }
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
            throw new common_1.BadRequestException('El horario se solapa con otro ya existente');
        }
        return this.prisma.availability.update({
            where: { id: slotId },
            data,
        });
    }
    async addSlot(userId, slot) {
        if (slot.startHour >= slot.endHour) {
            throw new common_1.BadRequestException('La hora de inicio debe ser anterior a la hora de fin');
        }
        const overlapping = await this.prisma.availability.findFirst({
            where: {
                userId,
                dayOfWeek: slot.dayOfWeek,
                startHour: { lt: slot.endHour },
                endHour: { gt: slot.startHour },
            },
        });
        if (overlapping) {
            throw new common_1.BadRequestException('El horario se solapa con otro ya existente');
        }
        return this.prisma.availability.create({
            data: { ...slot, userId },
        });
    }
    async findAvailableUsers(params) {
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
    validateNoOverlaps(slots) {
        for (let i = 0; i < slots.length; i++) {
            for (let j = i + 1; j < slots.length; j++) {
                if (slots[i].dayOfWeek === slots[j].dayOfWeek &&
                    slots[i].startHour < slots[j].endHour &&
                    slots[j].startHour < slots[i].endHour) {
                    throw new common_1.BadRequestException(`Los horarios del ${this.getDayName(slots[i].dayOfWeek)} se solapan`);
                }
            }
        }
    }
    getDayName(day) {
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
};
exports.AvailabilityService = AvailabilityService;
exports.AvailabilityService = AvailabilityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AvailabilityService);
//# sourceMappingURL=availability.service.js.map