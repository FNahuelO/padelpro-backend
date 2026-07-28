import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateCourtSlotDto {
  @IsOptional()
  @IsUUID()
  courtId?: string;

  @IsOptional()
  @IsString()
  courtLabel?: string;

  @IsString()
  slotDate: string;

  @IsNumber()
  @Min(8)
  @Max(23.5)
  startHour: number;

  @IsNumber()
  @Min(8.5)
  @Max(24)
  endHour: number;

  @IsOptional()
  @IsBoolean()
  notifyPlayers?: boolean;

  /** Horario muerto: aplica bonus de promoción si existe */
  @IsOptional()
  @IsBoolean()
  isDeadHour?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  bonusPoints?: number;
}
