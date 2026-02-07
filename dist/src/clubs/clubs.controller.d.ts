import { ClubsService } from './clubs.service';
export declare class ClubsController {
    private clubsService;
    constructor(clubsService: ClubsService);
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
}
