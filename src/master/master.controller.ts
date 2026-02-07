import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { MasterService } from './master.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('master')
export class MasterController {
  constructor(private masterService: MasterService) {}

  @Get('current')
  async getCurrentMaster() {
    return this.masterService.getCurrentMaster();
  }

  @Post('register')
  @UseGuards(JwtAuthGuard)
  async registerForMaster(
    @CurrentUser() user: any,
    @Body() data: { seasonId: string; partnerId: string },
  ) {
    return this.masterService.registerForMaster(
      data.seasonId,
      user.sub,
      data.partnerId,
    );
  }
}

