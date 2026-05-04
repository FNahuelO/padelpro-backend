import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { RegisterDto, LoginDto } from './dto';
import { AuthRepository } from './auth.repository';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private jwtService: JwtService,
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
    if (user.role === 'PLAYER') {
      await this.authRepository.createPlayerForUser(user.id);
    }

    const token = this.generateToken(user.id, user.email);

    return {
      access_token: token,
      user,
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

    const token = this.generateToken(user.id, user.email);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.authRepository.findMe(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return user;
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
}
