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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        return this.prisma.user.create({
            data,
        });
    }
    async findByEmail(email) {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }
    async findOne(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                name: true,
                photo: true,
                phone: true,
                gender: true,
                birthDate: true,
                description: true,
                location: true,
                rating: true,
                weeklyPoints: true,
                monthlyPoints: true,
                seasonPoints: true,
                sports: true,
                preferredHand: true,
                courtPosition: true,
                matchType: true,
                preferredPlayTime: true,
                createdAt: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        return user;
    }
    async getProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                photo: true,
                phone: true,
                gender: true,
                birthDate: true,
                description: true,
                location: true,
                rating: true,
                weeklyPoints: true,
                monthlyPoints: true,
                seasonPoints: true,
                sports: true,
                preferredHand: true,
                courtPosition: true,
                matchType: true,
                preferredPlayTime: true,
                createdAt: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        const matchesCount = await this.prisma.matchParticipant.count({
            where: { userId },
        });
        const completedMatches = await this.prisma.match.findMany({
            where: {
                status: 'COMPLETED',
                participants: { some: { userId } },
                result: { isNot: null },
            },
            include: {
                participants: {
                    where: { userId },
                    select: { team: true },
                },
                result: true,
            },
        });
        let wins = 0;
        let losses = 0;
        for (const match of completedMatches) {
            const userTeam = match.participants[0]?.team;
            if (match.result && userTeam) {
                const teamAWon = match.result.teamAScore > match.result.teamBScore;
                const userWon = (userTeam === 'A' && teamAWon) || (userTeam === 'B' && !teamAWon);
                if (userWon)
                    wins++;
                else
                    losses++;
            }
        }
        const followersCount = await this.prisma.friendRequest.count({
            where: {
                toUserId: userId,
                status: 'ACCEPTED',
            },
        });
        const followingCount = await this.prisma.friendRequest.count({
            where: {
                fromUserId: userId,
                status: 'ACCEPTED',
            },
        });
        return {
            ...user,
            stats: {
                matches: matchesCount,
                wins,
                losses,
                followers: followersCount,
                following: followingCount,
            },
            preferences: {
                preferredHand: user.preferredHand,
                courtPosition: user.courtPosition,
                matchType: user.matchType,
                preferredPlayTime: user.preferredPlayTime,
            },
        };
    }
    async getMatchHistory(userId, limit) {
        const matches = await this.prisma.match.findMany({
            where: {
                status: 'COMPLETED',
                participants: { some: { userId } },
                result: { isNot: null },
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: { id: true, name: true, rating: true },
                        },
                    },
                },
                result: true,
                club: {
                    select: { id: true, name: true },
                },
            },
            orderBy: { date: 'asc' },
            ...(limit ? { take: limit } : {}),
        });
        const baseRating = 1000;
        let cumulativeRating = baseRating;
        const K = 24;
        const history = matches.map((match) => {
            const userParticipant = match.participants.find((p) => p.userId === userId);
            const userTeam = userParticipant?.team;
            const teamA = match.participants.filter((p) => p.team === 'A');
            const teamB = match.participants.filter((p) => p.team === 'B');
            const avgRatingA = teamA.reduce((sum, p) => sum + p.user.rating, 0) /
                (teamA.length || 1);
            const avgRatingB = teamB.reduce((sum, p) => sum + p.user.rating, 0) /
                (teamB.length || 1);
            const teamAWon = match.result.teamAScore > match.result.teamBScore;
            const userWon = (userTeam === 'A' && teamAWon) || (userTeam === 'B' && !teamAWon);
            const isDraw = match.result.teamAScore === match.result.teamBScore;
            const userAvgRating = userTeam === 'A' ? avgRatingA : avgRatingB;
            const opponentAvgRating = userTeam === 'A' ? avgRatingB : avgRatingA;
            const expected = 1 / (1 + Math.pow(10, (opponentAvgRating - userAvgRating) / 400));
            const actual = userWon ? 1 : isDraw ? 0.5 : 0;
            const ratingChange = Math.round(K * (actual - expected));
            cumulativeRating += ratingChange;
            return {
                matchId: match.id,
                date: match.date,
                result: userWon ? 'win' : isDraw ? 'draw' : 'loss',
                score: `${match.result.teamAScore}-${match.result.teamBScore}`,
                userTeam,
                ratingChange,
                ratingAfter: cumulativeRating,
                club: match.club,
                opponent: match.participants
                    .filter((p) => p.team !== userTeam)
                    .map((p) => p.user.name),
            };
        });
        return {
            currentRating: history.length > 0
                ? history[history.length - 1].ratingAfter
                : baseRating,
            totalMatches: history.length,
            wins: history.filter((h) => h.result === 'win').length,
            losses: history.filter((h) => h.result === 'loss').length,
            draws: history.filter((h) => h.result === 'draw').length,
            history,
        };
    }
    async updateProfile(userId, dto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.photo !== undefined && { photo: dto.photo }),
                ...(dto.phone !== undefined && { phone: dto.phone }),
                ...(dto.gender !== undefined && { gender: dto.gender }),
                ...(dto.birthDate !== undefined && { birthDate: new Date(dto.birthDate) }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.location !== undefined && { location: dto.location }),
            },
            select: {
                id: true,
                email: true,
                name: true,
                photo: true,
                phone: true,
                gender: true,
                birthDate: true,
                description: true,
                location: true,
                rating: true,
                sports: true,
                preferredHand: true,
                courtPosition: true,
                matchType: true,
                preferredPlayTime: true,
            },
        });
    }
    async updatePreferences(userId, dto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                ...(dto.sports !== undefined && { sports: dto.sports }),
                ...(dto.preferredHand !== undefined && {
                    preferredHand: dto.preferredHand,
                }),
                ...(dto.courtPosition !== undefined && {
                    courtPosition: dto.courtPosition,
                }),
                ...(dto.matchType !== undefined && { matchType: dto.matchType }),
                ...(dto.preferredPlayTime !== undefined && {
                    preferredPlayTime: dto.preferredPlayTime,
                }),
            },
            select: {
                id: true,
                sports: true,
                preferredHand: true,
                courtPosition: true,
                matchType: true,
                preferredPlayTime: true,
            },
        });
    }
    async updateRating(userId, newRating) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { rating: newRating },
        });
    }
    async addWeeklyPoints(userId, points) {
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                weeklyPoints: {
                    increment: points,
                },
            },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map