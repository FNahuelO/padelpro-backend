import { PrismaService } from '../prisma/prisma.service';
export declare class ClubsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<({
        promotions: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            clubId: string;
            startHour: number;
            endHour: number;
            dayOfWeek: number;
            bonusPoints: number;
            priority: number;
            active: boolean;
        }[];
        _count: {
            courts: number;
        };
    } & {
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        address: string;
        plan: import("@prisma/client").$Enums.ClubPlan;
    })[]>;
    findOne(id: string): Promise<{
        courts: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            clubId: string;
            surface: string | null;
        }[];
        promotions: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            clubId: string;
            startHour: number;
            endHour: number;
            dayOfWeek: number;
            bonusPoints: number;
            priority: number;
            active: boolean;
        }[];
    } & {
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        address: string;
        plan: import("@prisma/client").$Enums.ClubPlan;
    }>;
    getPromotions(clubId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        clubId: string;
        startHour: number;
        endHour: number;
        dayOfWeek: number;
        bonusPoints: number;
        priority: number;
        active: boolean;
    }[]>;
}
