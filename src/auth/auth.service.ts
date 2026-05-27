import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { getLevelCategory, ratingToSkillScore, resolvePlayerRating } from '../common/utils';
import { AuthRepository } from './auth.repository';
import { ChangePasswordDto, LoginDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const existingUser = await this.authRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const user = await this.authRepository.createUser({
      email: dto.email,
      passwordHash: hashedPassword,
      name: dto.name,
      role: dto.role || 'PLAYER',
    });

    await this.authRepository.createPlayerForUser(user.id, {
      declaredCategory: dto.declaredCategory ?? null,
    });

    const fullUser = await this.authRepository.findMe(user.id);

    const token = this.generateToken(user.id, user.email);
    return {
      access_token: token,
      user: this.serializeAuthUser(fullUser ?? user),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.authRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const fullUser = await this.authRepository.findMe(user.id);
    const token = this.generateToken(user.id, user.email);
    return {
      access_token: token,
      user: this.serializeAuthUser(fullUser ?? user),
    };
  }

  async getMe(userId: string) {
    const user = await this.authRepository.findMe(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    return this.serializeAuthUser(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('La contraseña actual no es correcta');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('La nueva contraseña debe ser distinta de la actual');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.authRepository.updatePassword(userId, passwordHash);
    return { ok: true };
  }

  private generateToken(userId: string, email: string): string {
    const token = this.jwtService.sign({ sub: userId, email });
    this.logger.log(
      `JWT emitido user=${userId} fp=${this.fingerprint(token)} exp=${process.env.JWT_EXPIRES_IN || '7d'}`,
    );
    return token;
  }

  private fingerprint(token: string): string {
    return createHash('sha256').update(token).digest('hex').slice(0, 12);
  }

  private serializeAuthUser(user: any) {
    const extras =
      user?.extras && typeof user.extras === 'object' && !Array.isArray(user.extras)
        ? user.extras
        : {};
    const rating = resolvePlayerRating(user ?? {});

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      photo: user.photo_url ?? undefined,
      rating,
      skillScore: ratingToSkillScore(rating),
      levelCategory: getLevelCategory(rating),
      declaredCategory:
        typeof extras.declaredCategory === 'string' ? extras.declaredCategory : undefined,
    };
  }
}
