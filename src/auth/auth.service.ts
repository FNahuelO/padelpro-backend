import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RegisterDto, LoginDto } from './dto';
import { getLevelCategory } from '../common/utils';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
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
        levelCategory: getLevelCategory(user.rating),
        mainClubId: user.mainClubId,
        location: user.location,
        sports: user.sports,
        preferredHand: user.preferredHand,
        courtPosition: user.courtPosition,
        matchType: user.matchType,
        preferredPlayTime: user.preferredPlayTime,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
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
        levelCategory: getLevelCategory(user.rating),
        mainClubId: user.mainClubId,
        location: user.location,
        sports: user.sports,
        preferredHand: user.preferredHand,
        courtPosition: user.courtPosition,
        matchType: user.matchType,
        preferredPlayTime: user.preferredPlayTime,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      photo: user.photo,
      rating: user.rating,
      levelCategory: user.levelCategory,
      mainClubId: user.mainClubId,
      mainClub: user.mainClub,
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

  private generateToken(userId: string, email: string): string {
    return this.jwtService.sign({ sub: userId, email });
  }
}
