import { Module } from '@nestjs/common';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { MatchesRepository } from './matches.repository';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [MatchesController],
  providers: [MatchesService, MatchesRepository],
  exports: [MatchesService],
})
export class MatchesModule {}

