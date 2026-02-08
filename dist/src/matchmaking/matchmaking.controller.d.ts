import { MatchmakingService } from './matchmaking.service';
import { CreateMatchRequestDto } from './dto/create-match-request.dto';
export declare class MatchmakingController {
    private matchmakingService;
    constructor(matchmakingService: MatchmakingService);
    createMatchRequest(user: any, dto: CreateMatchRequestDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.MatchRequestStatus;
        clubId: string | null;
        date: Date;
        startHour: number;
        endHour: number;
        userId: string;
        minRating: number | null;
        maxRating: number | null;
        category: string | null;
    }>;
    runMatchmaking(id: string): Promise<{
        club: {
            id: string;
            name: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            address: string;
            plan: import("@prisma/client").$Enums.ClubPlan;
        };
        participants: ({
            user: {
                id: string;
                name: string;
                photo: string;
                rating: number;
            };
        } & {
            id: string;
            createdAt: Date;
            matchId: string;
            userId: string;
            team: import("@prisma/client").$Enums.Team;
            isCaptain: boolean;
            confirmedAt: Date | null;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.MatchStatus;
        clubId: string | null;
        courtId: string | null;
        date: Date;
        startHour: number;
        endHour: number;
        bonusPointsApplied: number;
    }>;
    getMyMatchRequests(user: any): Promise<({
        user: {
            id: string;
            email: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.MatchRequestStatus;
        clubId: string | null;
        date: Date;
        startHour: number;
        endHour: number;
        userId: string;
        minRating: number | null;
        maxRating: number | null;
        category: string | null;
    })[]>;
}
