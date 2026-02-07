import { IsOptional, IsDateString, IsInt, Min, Max, IsString } from 'class-validator';

export class CreateMatchRequestDto {
  @IsOptional()
  @IsString()
  clubId?: string;

  @IsDateString()
  date: string;

  @IsInt()
  @Min(0)
  @Max(23)
  startHour: number;

  @IsInt()
  @Min(0)
  @Max(23)
  endHour: number;

  @IsOptional()
  @IsInt()
  minRating?: number;

  @IsOptional()
  @IsInt()
  maxRating?: number;

  @IsOptional()
  @IsString()
  category?: string;
}

