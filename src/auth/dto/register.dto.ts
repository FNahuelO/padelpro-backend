import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(2)
  name: string;

  @ValidateIf((o: RegisterDto) => (o.role ?? 'PLAYER') === 'PLAYER')
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9._]+$/, {
    message: 'El nombre de usuario solo puede tener letras, números, punto y guión bajo',
  })
  nickname?: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @IsIn(['PLAYER', 'CLUB_ADMIN', 'ORGANIZER'])
  role?: 'PLAYER' | 'CLUB_ADMIN' | 'ORGANIZER';

  @ValidateIf((o: RegisterDto) => (o.role ?? 'PLAYER') === 'PLAYER')
  @IsIn(['8va', '7ma', '6ta', '5ta', '4ta', '3ra', '2da', '1ra'])
  declaredCategory?: '8va' | '7ma' | '6ta' | '5ta' | '4ta' | '3ra' | '2da' | '1ra';

  @ValidateIf((o: RegisterDto) => (o.role ?? 'PLAYER') === 'PLAYER')
  @IsIn(['Masculino', 'Femenino', 'Otro'])
  gender?: 'Masculino' | 'Femenino' | 'Otro';
}
