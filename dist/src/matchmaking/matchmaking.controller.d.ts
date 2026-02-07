import { MatchmakingService } from './matchmaking.service';
import { CreateMatchRequestDto } from './dto/create-match-request.dto';
export declare class MatchmakingController {
    private matchmakingService;
    constructor(matchmakingService: MatchmakingService);
    createMatchRequest(user: any, dto: CreateMatchRequestDto): Promise<{
        id: string;
        userId: string;
        startHour: number;
        endHour: number;
        createdAt: Date;
        updatedAt: Date;
        clubId: string | null;
        date: Date;
        minRating: number | null;
        maxRating: number | null;
        category: string | null;
        status: import("@prisma/client").$Enums.MatchRequestStatus;
    }>;
    runMatchmaking(id: string): Promise<{
        club: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
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
            userId: string;
            createdAt: Date;
            team: import("@prisma/client").$Enums.Team;
            isCaptain: boolean;
            confirmedAt: Date | null;
            matchId: string;
        })[];
    } & {
        id: string;
        startHour: number;
        endHour: number;
        createdAt: Date;
        updatedAt: Date;
        clubId: string | null;
        date: Date;
        status: import("@prisma/client").$Enums.MatchStatus;
        courtId: string | null;
        bonusPointsApplied: number;
    }>;
    getMyMatchRequests(user: any): Promise<({
        user: {
            id: string;
            name: string;
            email: string;
        };
    } & {
        id: string;
        userId: string;
        startHour: number;
        endHour: number;
        createdAt: Date;
        updatedAt: Date;
        clubId: string | null;
        date: Date;
        minRating: number | null;
        maxRating: number | null;
        category: string | null;
        status: import("@prisma/client").$Enums.MatchRequestStatus;
    })[]>;
}
