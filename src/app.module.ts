import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClubsModule } from './clubs/clubs.module';
import { AvailabilityModule } from './availability/availability.module';
import { MatchmakingModule } from './matchmaking/matchmaking.module';
import { MatchesModule } from './matches/matches.module';
import { RankingsModule } from './rankings/rankings.module';
import { ChatModule } from './chat/chat.module';
import { FriendsModule } from './friends/friends.module';
import { MasterModule } from './master/master.module';
import { ReportsModule } from './reports/reports.module';
import { PrismaModule } from './prisma/prisma.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { HealthController } from './health/health.controller';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
      global: true,
    }),
    PrismaModule,
    NotificationsModule,
    SchedulerModule,
    AuthModule,
    UsersModule,
    ClubsModule,
    AvailabilityModule,
    MatchmakingModule,
    MatchesModule,
    RankingsModule,
    ChatModule,
    FriendsModule,
    MasterModule,
    ReportsModule,
  ],
})
export class AppModule {}

