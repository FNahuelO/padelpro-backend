import { PrismaService } from '../prisma/prisma.service';
export declare class MasterService {
    private prisma;
    constructor(prisma: PrismaService);
    getCurrentMaster(): Promise<{
        masterEvents: ({
            participants: ({
                masterEvent: {
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    status: import("@prisma/client").$Enums.MasterEventStatus;
                    seasonId: string;
                    eventDate: Date | null;
                    bracket: import("@prisma/client/runtime/library").JsonValue | null;
                };
            } & {
                id: string;
                createdAt: Date;
                userId1: string;
                userId2: string;
                seed: number | null;
                masterEventId: string;
            })[];
        } & {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.MasterEventStatus;
            seasonId: string;
            eventDate: Date | null;
            bracket: import("@prisma/client/runtime/library").JsonValue | null;
        })[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.SeasonStatus;
        startDate: Date;
        endDate: Date;
    }>;
    createSeason(data: {
        name: string;
        startDate: Date;
        endDate: Date;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.SeasonStatus;
        startDate: Date;
        endDate: Date;
    }>;
    registerForMaster(seasonId: string, userId1: string, userId2: string): Promise<{
        id: string;
        createdAt: Date;
        userId1: string;
        userId2: string;
        seed: number | null;
        masterEventId: string;
    }>;
}
