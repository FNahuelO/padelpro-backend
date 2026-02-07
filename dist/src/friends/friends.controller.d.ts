import { FriendsService } from './friends.service';
export declare class FriendsController {
    private friendsService;
    constructor(friendsService: FriendsService);
    sendFriendRequest(toUserId: string, user: any): Promise<{
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
    acceptFriendRequest(requestId: string, user: any): Promise<{
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
    rejectFriendRequest(requestId: string, user: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fromUserId: string;
        toUserId: string;
        status: import("@prisma/client").$Enums.FriendRequestStatus;
    }>;
    deleteFriend(friendId: string, user: any): Promise<{
        message: string;
    }>;
    getFriends(user: any): Promise<{
        id: string;
        name: string;
        photo: string;
        rating: number;
    }[]>;
    getPendingRequests(user: any): Promise<({
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
