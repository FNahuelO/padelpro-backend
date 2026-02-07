import { PrismaService } from '../prisma/prisma.service';
export declare class ChatService {
    private prisma;
    constructor(prisma: PrismaService);
    getMatchMessages(matchId: string, userId: string): Promise<({
        user: {
            id: string;
            name: string;
            photo: string;
        };
    } & {
        id: string;
        createdAt: Date;
        matchId: string;
        userId: string;
        content: string;
    })[]>;
    createMessage(matchId: string, userId: string, content: string): Promise<{
        user: {
            id: string;
            name: string;
            photo: string;
        };
    } & {
        id: string;
        createdAt: Date;
        matchId: string;
        userId: string;
        content: string;
    }>;
}
