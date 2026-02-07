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
exports.RankingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let RankingsService = class RankingsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getWeeklyRanking(clubId, category) {
        const snapshot = await this.prisma.rankingSnapshot.findFirst({
            where: {
                type: 'WEEKLY',
                clubId: clubId || null,
                category: category || null,
            },
            orderBy: { generatedAt: 'desc' },
        });
        if (snapshot && this.isSnapshotRecent(snapshot.generatedAt)) {
            return snapshot.entries;
        }
        return this.generateWeeklyRanking(clubId, category);
    }
    async getMonthlyRanking(clubId, category) {
        const snapshot = await this.prisma.rankingSnapshot.findFirst({
            where: {
                type: 'MONTHLY',
                clubId: clubId || null,
                category: category || null,
            },
            orderBy: { generatedAt: 'desc' },
        });
        if (snapshot && this.isSnapshotRecent(snapshot.generatedAt, 'monthly')) {
            return snapshot.entries;
        }
        return this.generateMonthlyRanking(clubId, category);
    }
    async getSeasonRanking(seasonId) {
        return this.generateSeasonRanking();
    }
    async generateWeeklyRanking(clubId, category) {
        const weekStart = this.getWeekStart(new Date());
        const users = await this.prisma.user.findMany({
            where: {
                weeklyPointsRecords: clubId
                    ? {
                        some: {
                            clubId,
                            weekStartDate: weekStart,
                        },
                    }
                    : {
                        some: {
                            weekStartDate: weekStart,
                        },
                    },
            },
            include: {
                weeklyPointsRecords: {
                    where: {
                        weekStartDate: weekStart,
                        ...(clubId ? { clubId } : {}),
                    },
                },
            },
            orderBy: { rating: 'desc' },
        });
        const entries = users.map((user, index) => ({
            userId: user.id,
            name: user.name,
            photo: user.photo,
            rating: user.rating,
            points: user.weeklyPointsRecords[0]?.points || 0,
            position: index + 1,
        }));
        await this.prisma.rankingSnapshot.create({
            data: {
                type: 'WEEKLY',
                clubId: clubId || null,
                category: category || null,
                entries,
            },
        });
        return entries;
    }
    async generateMonthlyRanking(clubId, category) {
        const monthStart = this.getMonthStart(new Date());
        const users = await this.prisma.user.findMany({
            where: {},
            orderBy: { monthlyPoints: 'desc' },
        });
        const entries = users.map((user, index) => ({
            userId: user.id,
            name: user.name,
            photo: user.photo,
            rating: user.rating,
            points: user.monthlyPoints,
            position: index + 1,
        }));
        await this.prisma.rankingSnapshot.create({
            data: {
                type: 'MONTHLY',
                clubId: clubId || null,
                category: category || null,
                entries,
            },
        });
        return entries;
    }
    async generateSeasonRanking() {
        const users = await this.prisma.user.findMany({
            orderBy: { seasonPoints: 'desc' },
            take: 50,
        });
        return users.map((user, index) => ({
            userId: user.id,
            name: user.name,
            photo: user.photo,
            rating: user.rating,
            points: user.seasonPoints,
            position: index + 1,
        }));
    }
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        const weekStart = new Date(d.setDate(diff));
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
    }
    getMonthStart(date) {
        return new Date(date.getFullYear(), date.getMonth(), 1);
    }
    isSnapshotRecent(generatedAt, type = 'weekly') {
        const now = new Date();
        const diff = now.getTime() - generatedAt.getTime();
        const hours = diff / (1000 * 60 * 60);
        if (type === 'weekly') {
            return hours < 24;
        }
        return hours < 24 * 7;
    }
};
exports.RankingsService = RankingsService;
exports.RankingsService = RankingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RankingsService);
//# sourceMappingURL=rankings.service.js.map