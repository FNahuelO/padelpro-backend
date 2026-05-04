import { Controller, Get } from '@nestjs/common';
import { CommunityService } from './community.service';

@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Get('feed')
  feed() {
    return this.communityService.feed();
  }

  @Get('players-nearby')
  playersNearby() {
    return this.communityService.nearbyPlayers();
  }
}
