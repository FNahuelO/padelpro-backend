import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateClubPromotionDto {
  @IsString()
  label: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsInt()
  @Min(0)
  @Max(23)
  startHour: number;

  @IsInt()
  @Min(1)
  @Max(24)
  endHour: number;

  @IsInt()
  @Min(1)
  @Max(500)
  bonusPoints: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
