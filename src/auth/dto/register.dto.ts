import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @IsIn(['PLAYER', 'CLUB_ADMIN', 'ORGANIZER'])
  role?: 'PLAYER' | 'CLUB_ADMIN' | 'ORGANIZER';
}
