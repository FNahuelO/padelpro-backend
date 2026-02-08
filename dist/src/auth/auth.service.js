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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcryptjs");
const users_service_1 = require("../users/users.service");
let AuthService = class AuthService {
    constructor(usersService, jwtService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
    }
    async register(dto) {
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const user = await this.usersService.create({
            ...dto,
            password: hashedPassword,
        });
        const token = this.generateToken(user.id, user.email);
        return {
            access_token: token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                photo: user.photo,
                rating: user.rating,
                location: user.location,
                sports: user.sports,
                preferredHand: user.preferredHand,
                courtPosition: user.courtPosition,
                matchType: user.matchType,
                preferredPlayTime: user.preferredPlayTime,
            },
        };
    }
    async login(dto) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user) {
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        }
        const isPasswordValid = await bcrypt.compare(dto.password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        }
        const token = this.generateToken(user.id, user.email);
        return {
            access_token: token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                photo: user.photo,
                rating: user.rating,
                location: user.location,
                sports: user.sports,
                preferredHand: user.preferredHand,
                courtPosition: user.courtPosition,
                matchType: user.matchType,
                preferredPlayTime: user.preferredPlayTime,
            },
        };
    }
    async getMe(userId) {
        const user = await this.usersService.findOne(userId);
        if (!user) {
            throw new common_1.UnauthorizedException('Usuario no encontrado');
        }
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            photo: user.photo,
            rating: user.rating,
            location: user.location,
            weeklyPoints: user.weeklyPoints,
            monthlyPoints: user.monthlyPoints,
            seasonPoints: user.seasonPoints,
            sports: user.sports,
            preferredHand: user.preferredHand,
            courtPosition: user.courtPosition,
            matchType: user.matchType,
            preferredPlayTime: user.preferredPlayTime,
        };
    }
    generateToken(userId, email) {
        return this.jwtService.sign({ sub: userId, email });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map