import { IsEmail, IsIn, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

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

  @ValidateIf((o: RegisterDto) => (o.role ?? 'PLAYER') === 'PLAYER')
  @IsIn(['8va', '7ma', '6ta', '5ta', '4ta', '3ra', '2da', '1ra'])
  declaredCategory?: '8va' | '7ma' | '6ta' | '5ta' | '4ta' | '3ra' | '2da' | '1ra';
}
