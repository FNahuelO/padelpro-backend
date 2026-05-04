import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateMatchResultDto {
  @IsString()
  winnerTeam: string;

  @IsString()
  score: string;

  @IsOptional()
  @IsBoolean()
  confirmed?: boolean;
}
