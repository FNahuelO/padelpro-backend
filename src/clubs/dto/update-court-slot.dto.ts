import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class UpdateCourtSlotDto {
  @IsOptional()
  @IsUUID()
  courtId?: string;

  @IsOptional()
  @IsString()
  courtLabel?: string;

  @IsOptional()
  @IsString()
  slotDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(8)
  @Max(23.5)
  startHour?: number;

  @IsOptional()
  @IsNumber()
  @Min(8.5)
  @Max(24)
  endHour?: number;

  @IsOptional()
  @IsBoolean()
  isDeadHour?: boolean;
}
