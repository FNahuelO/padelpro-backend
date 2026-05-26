import { IsIn, IsUUID } from 'class-validator';

export class MatchInviteDto {
  @IsUUID()
  userId: string;

  @IsIn(['partner', 'opponent'])
  role: 'partner' | 'opponent';
}
