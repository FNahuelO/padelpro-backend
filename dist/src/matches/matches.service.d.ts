import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
export declare class MatchesService {
    private prisma;
    private usersService;
    constructor(prisma: PrismaService, usersService: UsersService);
    createMatch(data: {
        clubId?: string | null;
        date: Date;
        startHour: number;
        endHour: number;
        participants: Array<{
            userId: string;
            team: 'A' | 'B';
            isCaptain: boolean;
        }>;
        bonusPointsApplied: number;
    }): Promise<{
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
    findOne(id: string): Promise<{
        result: {
            id: string;
            createdAt: Date;
            matchId: string;
            teamAScore: number;
            teamBScore: number;
            submittedBy: string;
        };
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
    getMyMatches(userId: string): Promise<({
        result: {
            id: string;
            createdAt: Date;
            matchId: string;
            teamAScore: number;
            teamBScore: number;
            submittedBy: string;
        };
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
    })[]>;
    confirmMatch(matchId: string, userId: string): Promise<{
        result: {
            id: string;
            createdAt: Date;
            matchId: string;
            teamAScore: number;
            teamBScore: number;
            submittedBy: string;
        };
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
    submitResult(matchId: string, userId: string, data: {
        teamAScore: number;
        teamBScore: number;
    }): Promise<{
        result: {
            id: string;
            createdAt: Date;
            matchId: string;
            teamAScore: number;
            teamBScore: number;
            submittedBy: string;
        };
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
    private updateRatings;
    private addWeeklyPoints;
    private getWeekStart;
}
