import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module';
import { ClubsModule } from './clubs/clubs.module';
import { MatchesModule } from './matches/matches.module';
import { ChatModule } from './chat/chat.module';
import { HealthController } from './health/health.controller';
import { DatabaseModule } from './database/database.module';
import { PlayersModule } from './players/players.module';
import { CommunityModule } from './community/community.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ThirdTimeModule } from './third-time/third-time.module';
import { ShopModule } from './shop/shop.module';
import { SequelizeModule } from './database/sequelize/sequelize.module';
import { UsersModule } from './users/users.module';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
    DatabaseModule,
    SequelizeModule,
    RealtimeModule,
    AuthModule,
    PlayersModule,
    ClubsModule,
    MatchesModule,
    ChatModule,
    CommunityModule,
    TournamentsModule,
    ThirdTimeModule,
    ShopModule,
    UsersModule,
  ],
})
export class AppModule {}

