import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { PlayersService } from './players.service';

@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: { sub: string }) {
    return this.playersService.getMe(user.sub);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@CurrentUser() user: { sub: string }, @Body() dto: UpdatePlayerDto) {
    return this.playersService.updateMe(user.sub, dto);
  }

  @Get()
  listPlayers() {
    return this.playersService.list();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.playersService.getById(id);
  }
}
