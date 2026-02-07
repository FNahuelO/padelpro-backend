"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const clubs_module_1 = require("./clubs/clubs.module");
const availability_module_1 = require("./availability/availability.module");
const matchmaking_module_1 = require("./matchmaking/matchmaking.module");
const matches_module_1 = require("./matches/matches.module");
const rankings_module_1 = require("./rankings/rankings.module");
const chat_module_1 = require("./chat/chat.module");
const friends_module_1 = require("./friends/friends.module");
const master_module_1 = require("./master/master.module");
const reports_module_1 = require("./reports/reports.module");
const prisma_module_1 = require("./prisma/prisma.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            jwt_1.JwtModule.register({
                secret: process.env.JWT_SECRET || 'default-secret',
                signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
                global: true,
            }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            clubs_module_1.ClubsModule,
            availability_module_1.AvailabilityModule,
            matchmaking_module_1.MatchmakingModule,
            matches_module_1.MatchesModule,
            rankings_module_1.RankingsModule,
            chat_module_1.ChatModule,
            friends_module_1.FriendsModule,
            master_module_1.MasterModule,
            reports_module_1.ReportsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map