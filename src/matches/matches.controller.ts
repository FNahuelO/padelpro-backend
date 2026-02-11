import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { MatchesService } from './matches.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SubmitResultDto } from './dto/submit-result.dto';

@Controller('matches')
@UseGuards(JwtAuthGuard)
export class MatchesController {
  constructor(private matchesService: MatchesService) {}

  @Get('me')
  async getMyMatches(@CurrentUser() user: any) {
    return this.matchesService.getMyMatches(user.sub);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.matchesService.findOne(id);
  }

  @Post(':id/confirm')
  async confirmMatch(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.matchesService.confirmMatch(id, user.sub);
  }

  @Post(':id/accept')
  async acceptMatch(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.matchesService.acceptMatch(id, user.sub);
  }

  @Post(':id/decline')
  async declineMatch(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.matchesService.declineMatch(id, user.sub);
  }

  @Post(':id/result')
  async submitResult(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: SubmitResultDto,
  ) {
    return this.matchesService.submitResult(id, user.sub, dto);
  }
}

