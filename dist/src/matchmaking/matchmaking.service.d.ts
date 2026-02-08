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
    runMatchmaking(matchRequestId: string): Promise<{
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
    getMyMatchRequests(userId: string): Promise<({
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
