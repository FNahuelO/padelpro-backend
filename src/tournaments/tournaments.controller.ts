import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateTournamentPhotoDto } from './dto/create-tournament-photo.dto';
import { TournamentsService } from './tournaments.service';

@Controller('tournaments')
export class TournamentsController {
  constructor(
    private readonly tournamentsService: TournamentsService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@CurrentUser() user: { sub: string }, @Body() dto: any) {
    const created = await this.tournamentsService.create(user.sub, dto);
    this.realtimeGateway.emitTournamentUpdated(created);
    return created;
  }

  @Get()
  list() {
    return this.tournamentsService.list();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.tournamentsService.getById(id);
  }

  @Get(':id/photos')
  getPhotos(@Param('id') id: string) {
    return this.tournamentsService.listPhotos(id);
  }

  @Post(':id/photos')
  @UseGuards(JwtAuthGuard)
  async addPhoto(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateTournamentPhotoDto,
  ) {
    const photo = await this.tournamentsService.addPhoto(id, user.sub, dto);
    this.realtimeGateway.emitTournamentUpdated({ tournamentId: id, type: 'photo_added' });
    return photo;
  }

  @Delete(':id/photos/:photoId')
  @UseGuards(JwtAuthGuard)
  async deletePhoto(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.tournamentsService.deletePhoto(id, photoId, user.sub);
  }

  @Post(':id/register')
  register() {
    return { message: 'Estructura lista para registro de torneo (fase siguiente)' };
  }

  @Get(':id/registrations')
  registrations() {
    return [];
  }

  @Post(':id/generate-fixture')
  generateFixture() {
    return { message: 'Fixture automático complejo pendiente para fase siguiente' };
  }

  @Get(':id/fixture')
  fixture() {
    return [];
  }

  @Get(':id/standings')
  standings() {
    return [];
  }
}
