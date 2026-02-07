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
exports.MatchesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const users_service_1 = require("../users/users.service");
let MatchesService = class MatchesService {
    constructor(prisma, usersService) {
        this.prisma = prisma;
        this.usersService = usersService;
    }
    async createMatch(data) {
        const match = await this.prisma.match.create({
            data: {
                clubId: data.clubId,
                date: data.date,
                startHour: data.startHour,
                endHour: data.endHour,
                bonusPointsApplied: data.bonusPointsApplied,
                participants: {
                    create: data.participants.map((p) => ({
                        userId: p.userId,
                        team: p.team,
                        isCaptain: p.isCaptain,
                    })),
                },
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                photo: true,
                                rating: true,
                            },
                        },
                    },
                },
                club: true,
            },
        });
        return match;
    }
    async findOne(id) {
        const match = await this.prisma.match.findUnique({
            where: { id },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                photo: true,
                                rating: true,
                            },
                        },
                    },
                },
                club: true,
                result: true,
            },
        });
        if (!match) {
            throw new common_1.NotFoundException('Match no encontrado');
        }
        return match;
    }
    async getMyMatches(userId) {
        return this.prisma.match.findMany({
            where: {
                participants: {
                    some: { userId },
                },
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                photo: true,
                                rating: true,
                            },
                        },
                    },
                },
                club: true,
                result: true,
            },
            orderBy: { date: 'desc' },
        });
    }
    async confirmMatch(matchId, userId) {
        const match = await this.findOne(matchId);
        const participant = match.participants.find((p) => p.userId === userId);
        if (!participant) {
            throw new common_1.BadRequestException('No eres participante de este match');
        }
        if (participant.confirmedAt) {
            throw new common_1.BadRequestException('Ya confirmaste este match');
        }
        await this.prisma.matchParticipant.update({
            where: { id: participant.id },
            data: { confirmedAt: new Date() },
        });
        const updatedMatch = await this.findOne(matchId);
        const allConfirmed = updatedMatch.participants.every((p) => p.confirmedAt !== null);
        if (allConfirmed && updatedMatch.status === 'PENDING') {
            await this.prisma.match.update({
                where: { id: matchId },
                data: { status: 'CONFIRMED' },
            });
            if (updatedMatch.bonusPointsApplied > 0) {
                const weekStart = this.getWeekStart(new Date());
                for (const p of updatedMatch.participants) {
                    await this.addWeeklyPoints(p.userId, updatedMatch.bonusPointsApplied, updatedMatch.clubId || undefined, weekStart);
                }
            }
        }
        return this.findOne(matchId);
    }
    async submitResult(matchId, userId, data) {
        const match = await this.findOne(matchId);
        if (match.status !== 'CONFIRMED') {
            throw new common_1.BadRequestException('El match debe estar confirmado');
        }
        if (match.result) {
            throw new common_1.BadRequestException('El resultado ya fue cargado');
        }
        const participant = match.participants.find((p) => p.userId === userId);
        if (!participant) {
            throw new common_1.BadRequestException('No eres participante de este match');
        }
        await this.prisma.matchResult.create({
            data: {
                matchId,
                teamAScore: data.teamAScore,
                teamBScore: data.teamBScore,
                submittedBy: userId,
            },
        });
        await this.updateRatings(match, data.teamAScore, data.teamBScore);
        await this.prisma.match.update({
            where: { id: matchId },
            data: { status: 'COMPLETED' },
        });
        return this.findOne(matchId);
    }
    async updateRatings(match, teamAScore, teamBScore) {
        const teamA = match.participants.filter((p) => p.team === 'A');
        const teamB = match.participants.filter((p) => p.team === 'B');
        const avgRatingA = teamA.reduce((sum, p) => sum + p.user.rating, 0) / 2;
        const avgRatingB = teamB.reduce((sum, p) => sum + p.user.rating, 0) / 2;
        const expectedA = 1 / (1 + Math.pow(10, (avgRatingB - avgRatingA) / 400));
        const expectedB = 1 / (1 + Math.pow(10, (avgRatingA - avgRatingB) / 400));
        const K = 24;
        const actualA = teamAScore > teamBScore ? 1 : teamAScore < teamBScore ? 0 : 0.5;
        const actualB = teamBScore > teamAScore ? 1 : teamBScore < teamAScore ? 0 : 0.5;
        const changeA = K * (actualA - expectedA);
        const changeB = K * (actualB - expectedB);
        for (const p of teamA) {
            const newRating = Math.round(p.user.rating + changeA);
            await this.usersService.updateRating(p.userId, newRating);
        }
        for (const p of teamB) {
            const newRating = Math.round(p.user.rating + changeB);
            await this.usersService.updateRating(p.userId, newRating);
        }
    }
    async addWeeklyPoints(userId, points, clubId, weekStart) {
        await this.usersService.addWeeklyPoints(userId, points);
        const uniqueKey = {
            userId,
            clubId: clubId || null,
            weekStartDate: weekStart,
        };
        const existing = await this.prisma.weeklyPoints.findUnique({
            where: {
                userId_clubId_weekStartDate: uniqueKey,
            },
        });
        if (existing) {
            await this.prisma.weeklyPoints.update({
                where: {
                    userId_clubId_weekStartDate: uniqueKey,
                },
                data: {
                    points: {
                        increment: points,
                    },
                },
            });
        }
        else {
            await this.prisma.weeklyPoints.create({
                data: {
                    userId,
                    clubId: clubId || null,
                    weekStartDate: weekStart,
                    points,
                },
            });
        }
    }
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        const weekStart = new Date(d.setDate(diff));
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
    }
};
exports.MatchesService = MatchesService;
exports.MatchesService = MatchesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        users_service_1.UsersService])
], MatchesService);
//# sourceMappingURL=matches.service.js.map