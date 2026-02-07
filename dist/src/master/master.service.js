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
exports.MasterService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let MasterService = class MasterService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getCurrentMaster() {
        const season = await this.prisma.season.findFirst({
            where: {
                status: 'ACTIVE',
            },
            include: {
                masterEvents: {
                    include: {
                        participants: {
                            include: {
                                masterEvent: true,
                            },
                        },
                    },
                },
            },
            orderBy: { startDate: 'desc' },
        });
        if (!season) {
            return null;
        }
        return season;
    }
    async createSeason(data) {
        return this.prisma.season.create({
            data,
        });
    }
    async registerForMaster(seasonId, userId1, userId2) {
        const season = await this.prisma.season.findUnique({
            where: { id: seasonId },
            include: {
                masterEvents: {
                    where: { status: 'REGISTRATION' },
                },
            },
        });
        if (!season) {
            throw new common_1.NotFoundException('Temporada no encontrada');
        }
        if (season.masterEvents.length === 0) {
            throw new common_1.NotFoundException('No hay eventos de Master abiertos');
        }
        const event = season.masterEvents[0];
        return this.prisma.masterParticipant.create({
            data: {
                masterEventId: event.id,
                userId1,
                userId2,
            },
        });
    }
};
exports.MasterService = MasterService;
exports.MasterService = MasterService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MasterService);
//# sourceMappingURL=master.service.js.map