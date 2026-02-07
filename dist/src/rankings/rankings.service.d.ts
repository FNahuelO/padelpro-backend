import { PrismaService } from '../prisma/prisma.service';
export declare class RankingsService {
    private prisma;
    constructor(prisma: PrismaService);
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
    private generateWeeklyRanking;
    private generateMonthlyRanking;
    private generateSeasonRanking;
    private getWeekStart;
    private getMonthStart;
    private isSnapshotRecent;
}
