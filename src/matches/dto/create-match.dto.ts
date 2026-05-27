import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { MatchInviteDto } from './match-invite.dto';

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
  @IsInt()
  @Min(0)
  @Max(100)
  levelMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  levelMax?: number;

  @IsIn(['male', 'female', 'mixed', 'open'])
  gender: 'male' | 'female' | 'mixed' | 'open';

  @IsIn(['friendly', 'competitive'])
  mode: 'friendly' | 'competitive';

  @IsInt()
  @Min(2)
  @Max(8)
  neededPlayers: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => MatchInviteDto)
  invites?: MatchInviteDto[];
}
