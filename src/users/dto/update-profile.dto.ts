import {
  IsOptional,
  IsString,
  IsArray,
  IsIn,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  @IsIn(['Masculino', 'Femenino', 'Otro'])
  gender?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;
}

export class UpdatePreferencesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sports?: string[];

  @IsOptional()
  @IsString()
  @IsIn(['Derecha', 'Izquierda'])
  preferredHand?: string;

  @IsOptional()
  @IsString()
  @IsIn(['Lado derecho', 'Lado izquierdo'])
  courtPosition?: string;

  @IsOptional()
  @IsString()
  @IsIn(['Competitivo', 'Amistoso'])
  matchType?: string;

  @IsOptional()
  @IsString()
  @IsIn(['Mañana', 'Tarde', 'Noche'])
  preferredPlayTime?: string;
}
