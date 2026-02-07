import { Module } from '@nestjs/common';
import { MatchmakingController } from './matchmaking.controller';
import { MatchmakingService } from './matchmaking.service';
import { MatchesModule } from '../matches/matches.module';
import { AvailabilityModule } from '../availability/availability.module';
import { ClubsModule } from '../clubs/clubs.module';

@Module({
  imports: [MatchesModule, AvailabilityModule, ClubsModule],
  controllers: [MatchmakingController],
  providers: [MatchmakingService],
  exports: [MatchmakingService],
})
export class MatchmakingModule {}

