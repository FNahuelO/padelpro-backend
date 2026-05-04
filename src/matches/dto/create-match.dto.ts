import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateMatchDto {
  @IsOptional()
  @IsString()
  clubId?: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  zone?: string;

  @IsOptional()
  @Min(1)
  @Max(7)
  levelMin?: number;

  @IsOptional()
  @Min(1)
  @Max(7)
  levelMax?: number;

  @IsIn(['male', 'female', 'mixed', 'open'])
  gender: 'male' | 'female' | 'mixed' | 'open';

  @IsIn(['friendly', 'competitive'])
  mode: 'friendly' | 'competitive';

  @IsInt()
  @Min(2)
  @Max(8)
  neededPlayers: number;
}
