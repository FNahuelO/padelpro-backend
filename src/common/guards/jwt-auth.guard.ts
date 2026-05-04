import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    const route = `${request.method} ${request.url}`;

    if (!token) {
      this.logger.warn(`Auth: sin Bearer [${route}] authHeader=${this.describeAuthHeader(request)}`);
      throw new UnauthorizedException('Token no proporcionado');
    }

    try {
      const payload = this.jwtService.verify(token);
      this.logger.log(`Auth OK [${route}] fp=${this.fingerprint(token)}`);
      request.user = payload;
      return true;
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : 'Error';
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Auth: JWT no válido [${route}] fp=${this.fingerprint(token)} ${name}: ${message}`,
      );
      throw new UnauthorizedException('Token inválido');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  /** Sin datos sensibles: solo indica si llegó header y con qué esquema. */
  private describeAuthHeader(request: any): string {
    const raw = request.headers?.authorization;
    if (raw == null || raw === '') return '(vacío)';
    if (typeof raw !== 'string') return '(no string)';
    const [type] = raw.split(' ');
    return type ? `presente, esquema=${type}` : 'presente';
  }

  private fingerprint(token: string): string {
    return createHash('sha256').update(token).digest('hex').slice(0, 12);
  }
}

