import { RankingsService } from './rankings.service';
export declare class RankingsController {
    private rankingsService;
    constructor(rankingsService: RankingsService);
    getWeeklyRanking(clubId?: string, category?: string): Promise<any[]>;
    getMonthlyRanking(clubId?: string, category?: string): Promise<any[]>;
    getSeasonRanking(seasonId?: string): Promise<{
        userId: string;
        name: string;
        photo: string;
        rating: number;
        points: number;
        position: number;
    }[]>;
}
