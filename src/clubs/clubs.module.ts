import { Module } from '@nestjs/common';
import { ClubsController } from './clubs.controller';
import { ClubCommentsService } from './club-comments.service';
import { ClubPointsService } from './club-points.service';
import { ClubsService } from './clubs.service';

@Module({
  controllers: [ClubsController],
  providers: [ClubsService, ClubPointsService, ClubCommentsService],
  exports: [ClubsService, ClubPointsService, ClubCommentsService],
})
export class ClubsModule {}
