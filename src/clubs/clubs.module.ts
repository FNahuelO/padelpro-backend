import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { ClubGapFillCron } from './club-gap-fill.cron';
import { ClubGapFillService } from './club-gap-fill.service';
import { ClubManagerService } from './club-manager.service';
import { ClubsController } from './clubs.controller';
import { ClubCommentsService } from './club-comments.service';
import { ClubPointsService } from './club-points.service';
import { ClubsService } from './clubs.service';

@Module({
  imports: [TournamentsModule, NotificationsModule],
  controllers: [ClubsController],
  providers: [
    ClubsService,
    ClubPointsService,
    ClubCommentsService,
    ClubGapFillService,
    ClubGapFillCron,
    ClubManagerService,
    OptionalJwtAuthGuard,
  ],
  exports: [
    ClubsService,
    ClubPointsService,
    ClubCommentsService,
    ClubGapFillService,
    ClubManagerService,
  ],
})
export class ClubsModule {}
