import { PrismaService } from '../prisma/prisma.service';
export declare class FriendsService {
    private prisma;
    constructor(prisma: PrismaService);
    sendFriendRequest(fromUserId: string, toUserId: string): Promise<{
        fromUser: {
            id: string;
            name: string;
            photo: string;
        };
        toUser: {
            id: string;
            name: string;
            photo: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fromUserId: string;
        toUserId: string;
        status: import("@prisma/client").$Enums.FriendRequestStatus;
    }>;
    acceptFriendRequest(requestId: string, userId: string): Promise<{
        fromUser: {
            id: string;
            name: string;
            photo: string;
        };
        toUser: {
            id: string;
            name: string;
            photo: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fromUserId: string;
        toUserId: string;
        status: import("@prisma/client").$Enums.FriendRequestStatus;
    }>;
    rejectFriendRequest(requestId: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fromUserId: string;
        toUserId: string;
        status: import("@prisma/client").$Enums.FriendRequestStatus;
    }>;
    deleteFriend(friendId: string, userId: string): Promise<{
        message: string;
    }>;
    getFriends(userId: string): Promise<{
        id: string;
        name: string;
        photo: string;
        rating: number;
    }[]>;
    getPendingRequests(userId: string): Promise<({
        fromUser: {
            id: string;
            name: string;
            photo: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fromUserId: string;
        toUserId: string;
        status: import("@prisma/client").$Enums.FriendRequestStatus;
    })[]>;
}
