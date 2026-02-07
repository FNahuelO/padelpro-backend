import { PrismaService } from '../prisma/prisma.service';
export declare class ReportsService {
    private prisma;
    constructor(prisma: PrismaService);
    createReport(data: {
        reporterId: string;
        reportedUserId: string;
        matchId?: string;
        reason: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ReportStatus;
        matchId: string | null;
        reason: string;
        reporterId: string;
        reportedUserId: string;
    }>;
    blockUser(blockerId: string, blockedId: string): Promise<{
        id: string;
        createdAt: Date;
        blockerId: string;
        blockedId: string;
    }>;
}
