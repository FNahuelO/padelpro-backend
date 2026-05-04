import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ClubsService } from './clubs.service';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';

@Controller('clubs')
export class ClubsController {
  constructor(private clubsService: ClubsService) {}

  @Get()
  async findAll() {
    return this.clubsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.clubsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: { sub: string }, @Body() dto: CreateClubDto) {
    return this.clubsService.create(user.sub, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: UpdateClubDto,
  ) {
    return this.clubsService.update(user.sub, id, dto);
  }
}

