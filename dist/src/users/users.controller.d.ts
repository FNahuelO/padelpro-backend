import { UsersService } from './users.service';
import { UpdateProfileDto, UpdatePreferencesDto } from './dto/update-profile.dto';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    getProfile(user: any): Promise<{
        stats: {
            matches: number;
            wins: number;
            losses: number;
            followers: number;
            following: number;
        };
        preferences: {
            preferredHand: string;
            courtPosition: string;
            matchType: string;
            preferredPlayTime: string;
        };
        id: string;
        email: string;
        name: string;
        photo: string;
        phone: string;
        gender: string;
        birthDate: Date;
        description: string;
        location: string;
        rating: number;
        weeklyPoints: number;
        monthlyPoints: number;
        seasonPoints: number;
        createdAt: Date;
        sports: string[];
        preferredHand: string;
        courtPosition: string;
        matchType: string;
        preferredPlayTime: string;
    }>;
    updateProfile(user: any, dto: UpdateProfileDto): Promise<{
        id: string;
        email: string;
        name: string;
        photo: string;
        phone: string;
        gender: string;
        birthDate: Date;
        description: string;
        location: string;
        rating: number;
        sports: string[];
        preferredHand: string;
        courtPosition: string;
        matchType: string;
        preferredPlayTime: string;
    }>;
    updatePreferences(user: any, dto: UpdatePreferencesDto): Promise<{
        id: string;
        sports: string[];
        preferredHand: string;
        courtPosition: string;
        matchType: string;
        preferredPlayTime: string;
    }>;
    getMatchHistory(user: any, limit?: string): Promise<{
        currentRating: number;
        totalMatches: number;
        wins: number;
        losses: number;
        draws: number;
        history: {
            matchId: string;
            date: Date;
            result: string;
            score: string;
            userTeam: import("@prisma/client").$Enums.Team;
            ratingChange: number;
            ratingAfter: number;
            club: {
                id: string;
                name: string;
            };
            opponent: string[];
        }[];
    }>;
    findOne(id: string): Promise<{
        id: string;
        email: string;
        name: string;
        photo: string;
        phone: string;
        gender: string;
        birthDate: Date;
        description: string;
        location: string;
        rating: number;
        weeklyPoints: number;
        monthlyPoints: number;
        seasonPoints: number;
        createdAt: Date;
        sports: string[];
        preferredHand: string;
        courtPosition: string;
        matchType: string;
        preferredPlayTime: string;
    }>;
}
