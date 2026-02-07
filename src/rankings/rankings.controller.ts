import { Controller, Get, Query } from '@nestjs/common';
import { RankingsService } from './rankings.service';

@Controller('rankings')
export class RankingsController {
  constructor(private rankingsService: RankingsService) {}

  @Get('weekly')
  async getWeeklyRanking(
    @Query('clubId') clubId?: string,
    @Query('category') category?: string,
  ) {
    return this.rankingsService.getWeeklyRanking(clubId, category);
  }

  @Get('monthly')
  async getMonthlyRanking(
    @Query('clubId') clubId?: string,
    @Query('category') category?: string,
  ) {
    return this.rankingsService.getMonthlyRanking(clubId, category);
  }

  @Get('season')
  async getSeasonRanking(@Query('seasonId') seasonId?: string) {
    return this.rankingsService.getSeasonRanking(seasonId);
  }
}

