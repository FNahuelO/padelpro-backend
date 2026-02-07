import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { ClubsService } from '../clubs/clubs.service';
import { MatchesService } from '../matches/matches.service';
export declare class MatchmakingService {
    private prisma;
    private availabilityService;
    private clubsService;
    private matchesService;
    constructor(prisma: PrismaService, availabilityService: AvailabilityService, clubsService: ClubsService, matchesService: MatchesService);
    createMatchRequest(userId: string, data: {
        clubId?: string;
        date: Date;
        startHour: number;
        endHour: number;
        minRating?: number;
        maxRating?: number;
        category?: string;
    }): Promise<{
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
    runMatchmaking(matchRequestId: string): Promise<{
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
    getMyMatchRequests(userId: string): Promise<({
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
