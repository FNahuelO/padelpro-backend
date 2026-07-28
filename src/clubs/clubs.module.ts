import { Module } from '@nestjs/common';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { ClubsController } from './clubs.controller';
import { ClubCommentsService } from './club-comments.service';
import { ClubPointsService } from './club-points.service';
import { ClubsService } from './clubs.service';

@Module({
  imports: [TournamentsModule],
  controllers: [ClubsController],
  providers: [ClubsService, ClubPointsService, ClubCommentsService],
  exports: [ClubsService, ClubPointsService, ClubCommentsService],
})
export class ClubsModule {}
