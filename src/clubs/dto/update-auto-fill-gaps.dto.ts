import { IsBoolean } from 'class-validator';

export class UpdateAutoFillGapsDto {
  @IsBoolean()
  enabled: boolean;
}
