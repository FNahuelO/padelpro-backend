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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchmakingController = void 0;
const common_1 = require("@nestjs/common");
const matchmaking_service_1 = require("./matchmaking.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const create_match_request_dto_1 = require("./dto/create-match-request.dto");
let MatchmakingController = class MatchmakingController {
    constructor(matchmakingService) {
        this.matchmakingService = matchmakingService;
    }
    async createMatchRequest(user, dto) {
        return this.matchmakingService.createMatchRequest(user.sub, {
            ...dto,
            date: new Date(dto.date),
        });
    }
    async runMatchmaking(id) {
        return this.matchmakingService.runMatchmaking(id);
    }
    async getMyMatchRequests(user) {
        return this.matchmakingService.getMyMatchRequests(user.sub);
    }
};
exports.MatchmakingController = MatchmakingController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_match_request_dto_1.CreateMatchRequestDto]),
    __metadata("design:returntype", Promise)
], MatchmakingController.prototype, "createMatchRequest", null);
__decorate([
    (0, common_1.Post)('run/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MatchmakingController.prototype, "runMatchmaking", null);
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MatchmakingController.prototype, "getMyMatchRequests", null);
exports.MatchmakingController = MatchmakingController = __decorate([
    (0, common_1.Controller)('match-requests'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [matchmaking_service_1.MatchmakingService])
], MatchmakingController);
//# sourceMappingURL=matchmaking.controller.js.map