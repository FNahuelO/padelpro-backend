import { MasterService } from './master.service';
export declare class MasterController {
    private masterService;
    constructor(masterService: MasterService);
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
    registerForMaster(user: any, data: {
        seasonId: string;
        partnerId: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        userId1: string;
        userId2: string;
        seed: number | null;
        masterEventId: string;
    }>;
}
