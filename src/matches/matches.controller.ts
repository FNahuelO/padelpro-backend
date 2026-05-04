import {
  Patch,
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
import { CreateMatchDto } from './dto/create-match.dto';
import { CreateMatchResultDto } from './dto/create-match-result.dto';
import { UpdateMatchStatusDto } from './dto/update-match-status.dto';

@Controller('matches')
@UseGuards(JwtAuthGuard)
export class MatchesController {
  constructor(private matchesService: MatchesService) {}

  @Post()
  createMatch(@CurrentUser() user: any, @Body() dto: CreateMatchDto) {
    return this.matchesService.create(user.sub, dto);
  }

  @Get()
  findAll() {
    return this.matchesService.findAll();
  }

  @Get('me')
  async getMyMatches(@CurrentUser() user: any) {
    return this.matchesService.getMyMatches(user.sub);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.matchesService.findOne(id);
  }

  @Post(':id/join')
  joinMatch(@Param('id') id: string, @CurrentUser() user: any) {
    return this.matchesService.joinMatch(id, user.sub);
  }

  @Post(':id/leave')
  leaveMatch(@Param('id') id: string, @CurrentUser() user: any) {
    return this.matchesService.leaveMatch(id, user.sub);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateMatchStatusDto) {
    return this.matchesService.updateMatchStatus(id, dto);
  }

  @Post(':id/result')
  async submitResult(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: CreateMatchResultDto,
  ) {
    return this.matchesService.submitResult(id, user.sub, dto);
  }
}

