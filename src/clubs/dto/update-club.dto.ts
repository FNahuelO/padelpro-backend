import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import type { ClubSubscriptionPlan } from '../../common/utils/club-plan.util';

const CLUB_PLANS = ['BASIC', 'GROWTH', 'PRO'] as const;

export class UpdateClubDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  zone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  /** Plan del club: define multiplicador en horarios promocionales (GROWTH x1.5, PRO x2). */
  @IsOptional()
  @IsEnum(CLUB_PLANS)
  subscriptionPlan?: ClubSubscriptionPlan;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}
