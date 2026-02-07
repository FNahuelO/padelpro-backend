"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FriendsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let FriendsService = class FriendsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async sendFriendRequest(fromUserId, toUserId) {
        if (fromUserId === toUserId) {
            throw new common_1.BadRequestException('No puedes agregarte a ti mismo');
        }
        const existing = await this.prisma.friendRequest.findFirst({
            where: {
                OR: [
                    { fromUserId, toUserId },
                    { fromUserId: toUserId, toUserId: fromUserId },
                ],
            },
        });
        if (existing) {
            throw new common_1.BadRequestException('Ya existe una solicitud de amistad');
        }
        return this.prisma.friendRequest.create({
            data: {
                fromUserId,
                toUserId,
            },
            include: {
                fromUser: {
                    select: {
                        id: true,
                        name: true,
                        photo: true,
                    },
                },
                toUser: {
                    select: {
                        id: true,
                        name: true,
                        photo: true,
                    },
                },
            },
        });
    }
    async acceptFriendRequest(requestId, userId) {
        const request = await this.prisma.friendRequest.findUnique({
            where: { id: requestId },
        });
        if (!request) {
            throw new common_1.NotFoundException('Solicitud no encontrada');
        }
        if (request.toUserId !== userId) {
            throw new common_1.BadRequestException('No puedes aceptar esta solicitud');
        }
        return this.prisma.friendRequest.update({
            where: { id: requestId },
            data: { status: 'ACCEPTED' },
            include: {
                fromUser: {
                    select: {
                        id: true,
                        name: true,
                        photo: true,
                    },
                },
                toUser: {
                    select: {
                        id: true,
                        name: true,
                        photo: true,
                    },
                },
            },
        });
    }
    async rejectFriendRequest(requestId, userId) {
        const request = await this.prisma.friendRequest.findUnique({
            where: { id: requestId },
        });
        if (!request) {
            throw new common_1.NotFoundException('Solicitud no encontrada');
        }
        if (request.toUserId !== userId) {
            throw new common_1.BadRequestException('No puedes rechazar esta solicitud');
        }
        return this.prisma.friendRequest.update({
            where: { id: requestId },
            data: { status: 'REJECTED' },
        });
    }
    async deleteFriend(friendId, userId) {
        const request = await this.prisma.friendRequest.findFirst({
            where: {
                status: 'ACCEPTED',
                OR: [
                    { fromUserId: userId, toUserId: friendId },
                    { fromUserId: friendId, toUserId: userId },
                ],
            },
        });
        if (!request) {
            throw new common_1.NotFoundException('Amistad no encontrada');
        }
        await this.prisma.friendRequest.delete({
            where: { id: request.id },
        });
        return { message: 'Amigo eliminado' };
    }
    async getFriends(userId) {
        const requests = await this.prisma.friendRequest.findMany({
            where: {
                status: 'ACCEPTED',
                OR: [
                    { fromUserId: userId },
                    { toUserId: userId },
                ],
            },
            include: {
                fromUser: {
                    select: {
                        id: true,
                        name: true,
                        photo: true,
                        rating: true,
                    },
                },
                toUser: {
                    select: {
                        id: true,
                        name: true,
                        photo: true,
                        rating: true,
                    },
                },
            },
        });
        return requests.map((r) => r.fromUserId === userId ? r.toUser : r.fromUser);
    }
    async getPendingRequests(userId) {
        return this.prisma.friendRequest.findMany({
            where: {
                toUserId: userId,
                status: 'PENDING',
            },
            include: {
                fromUser: {
                    select: {
                        id: true,
                        name: true,
                        photo: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
};
exports.FriendsService = FriendsService;
exports.FriendsService = FriendsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FriendsService);
//# sourceMappingURL=friends.service.js.map