import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CommunityService } from './community.service';

@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Get('feed')
  @UseGuards(JwtAuthGuard)
  feed(@CurrentUser() user: { sub: string }) {
    return this.communityService.feed(user.sub);
  }

  @Get('players-nearby')
  playersNearby() {
    return this.communityService.nearbyPlayers();
  }
}
