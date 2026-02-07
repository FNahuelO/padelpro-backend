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
exports.MatchmakingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const availability_service_1 = require("../availability/availability.service");
const clubs_service_1 = require("../clubs/clubs.service");
const matches_service_1 = require("../matches/matches.service");
let MatchmakingService = class MatchmakingService {
    constructor(prisma, availabilityService, clubsService, matchesService) {
        this.prisma = prisma;
        this.availabilityService = availabilityService;
        this.clubsService = clubsService;
        this.matchesService = matchesService;
    }
    async createMatchRequest(userId, data) {
        return this.prisma.matchRequest.create({
            data: {
                ...data,
                userId,
                date: new Date(data.date),
            },
        });
    }
    async runMatchmaking(matchRequestId) {
        const matchRequest = await this.prisma.matchRequest.findUnique({
            where: { id: matchRequestId },
            include: { user: true },
        });
        if (!matchRequest) {
            throw new common_1.NotFoundException('MatchRequest no encontrado');
        }
        if (matchRequest.status !== 'PENDING') {
            throw new common_1.BadRequestException('MatchRequest ya procesado');
        }
        const availableUsers = await this.availabilityService.findAvailableUsers({
            date: matchRequest.date,
            startHour: matchRequest.startHour,
            endHour: matchRequest.endHour,
            minRating: matchRequest.minRating || undefined,
            maxRating: matchRequest.maxRating || undefined,
            excludeUserIds: [matchRequest.userId],
        });
        if (availableUsers.length < 3) {
            throw new common_1.BadRequestException('No hay suficientes jugadores disponibles');
        }
        const selectedUsers = availableUsers.slice(0, 3);
        const allUsers = [matchRequest.user, ...selectedUsers];
        let bonusPoints = 0;
        if (matchRequest.clubId) {
            const club = await this.clubsService.findOne(matchRequest.clubId);
            const hour = matchRequest.startHour;
            const dayOfWeek = matchRequest.date.getDay();
            const promotion = club.promotions?.find((p) => p.dayOfWeek === dayOfWeek &&
                p.startHour <= hour &&
                p.endHour >= hour &&
                p.active);
            if (promotion) {
                bonusPoints = promotion.bonusPoints;
            }
            else if (hour >= 10 && hour < 16) {
                bonusPoints = 10;
            }
        }
        const match = await this.matchesService.createMatch({
            clubId: matchRequest.clubId || null,
            date: matchRequest.date,
            startHour: matchRequest.startHour,
            endHour: matchRequest.endHour,
            participants: allUsers.map((u, index) => ({
                userId: u.id,
                team: index < 2 ? 'A' : 'B',
                isCaptain: index === 0,
            })),
            bonusPointsApplied: bonusPoints,
        });
        await this.prisma.matchRequest.update({
            where: { id: matchRequestId },
            data: { status: 'MATCHED' },
        });
        return match;
    }
    async getMyMatchRequests(userId) {
        return this.prisma.matchRequest.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
    }
};
exports.MatchmakingService = MatchmakingService;
exports.MatchmakingService = MatchmakingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        availability_service_1.AvailabilityService,
        clubs_service_1.ClubsService,
        matches_service_1.MatchesService])
], MatchmakingService);
//# sourceMappingURL=matchmaking.service.js.map