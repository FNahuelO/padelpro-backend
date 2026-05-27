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
  @Min(0)
  @Max(100)
  minRating?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  maxRating?: number;

  @IsOptional()
  @IsString()
  category?: string;
}

