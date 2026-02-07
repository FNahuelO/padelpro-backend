import { MatchesService } from './matches.service';
import { SubmitResultDto } from './dto/submit-result.dto';
export declare class MatchesController {
    private matchesService;
    constructor(matchesService: MatchesService);
    getMyMatches(user: any): Promise<({
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
    confirmMatch(id: string, user: any): Promise<{
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
    submitResult(id: string, user: any, dto: SubmitResultDto): Promise<{
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
}
