import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateCourtSlotDto {
  @IsString()
  courtLabel: string;

  @IsString()
  slotDate: string;

  @IsInt()
  @Min(0)
  @Max(23)
  startHour: number;

  @IsInt()
  @Min(1)
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
