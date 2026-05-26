import { ArrayMaxSize, IsArray, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { MatchInviteDto } from '../../matches/dto/match-invite.dto';
import { ValidateNested } from 'class-validator';

export class RunMatchmakingDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => MatchInviteDto)
  invites?: MatchInviteDto[];
}
