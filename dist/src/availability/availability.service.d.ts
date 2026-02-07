import { PrismaService } from '../prisma/prisma.service';
export declare class AvailabilityService {
    private prisma;
    constructor(prisma: PrismaService);
    setAvailability(userId: string, availabilities: Array<{
        dayOfWeek: number;
        startHour: number;
        endHour: number;
    }>): Promise<{
        id: string;
        userId: string;
        dayOfWeek: number;
        startHour: number;
        endHour: number;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getMyAvailability(userId: string): Promise<{
        id: string;
        userId: string;
        dayOfWeek: number;
        startHour: number;
        endHour: number;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    deleteSlot(userId: string, slotId: string): Promise<{
        message: string;
    }>;
    updateSlot(userId: string, slotId: string, data: {
        dayOfWeek?: number;
        startHour?: number;
        endHour?: number;
    }): Promise<{
        id: string;
        userId: string;
        dayOfWeek: number;
        startHour: number;
        endHour: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    addSlot(userId: string, slot: {
        dayOfWeek: number;
        startHour: number;
        endHour: number;
    }): Promise<{
        id: string;
        userId: string;
        dayOfWeek: number;
        startHour: number;
        endHour: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAvailableUsers(params: {
        date: Date;
        startHour: number;
        endHour: number;
        minRating?: number;
        maxRating?: number;
        excludeUserIds?: string[];
    }): Promise<{
        id: string;
        name: string;
        photo: string;
        rating: number;
    }[]>;
    private validateNoOverlaps;
    private getDayName;
}
