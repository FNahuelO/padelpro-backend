import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ClubCommentsService } from './club-comments.service';
import { ClubsService } from './clubs.service';
import { CreateClubCommentDto } from './dto/create-club-comment.dto';
import { CreateClubDto } from './dto/create-club.dto';
import { CreateClubPromotionDto } from './dto/create-club-promotion.dto';
import { CreateClubRewardDto } from './dto/create-club-reward.dto';
import { CreateCourtSlotDto } from './dto/create-court-slot.dto';
import { UpdateClubDto } from './dto/update-club.dto';

@Controller('clubs')
export class ClubsController {
  constructor(
    private readonly clubsService: ClubsService,
    private readonly clubCommentsService: ClubCommentsService,
  ) {}

  @Get()
  findAll() {
    return this.clubsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
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
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: UpdateClubDto,
  ) {
    return this.clubsService.update(user.sub, id, dto);
  }

  @Get(':id/dashboard')
  @UseGuards(JwtAuthGuard)
  getDashboard(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.clubsService.getDashboard(id, user.sub);
  }

  @Get(':id/leaderboard')
  getLeaderboard(@Param('id') id: string, @Query('month') month?: string) {
    return this.clubsService.getPublicLeaderboard(id, 20, month);
  }

  @Get(':id/rewards-catalog')
  getRewardsCatalog(@Param('id') id: string) {
    return this.clubsService.getPublicRewards(id);
  }

  @Get(':id/comments')
  listComments(@Param('id') id: string) {
    return this.clubCommentsService.list(id);
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  createComment(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateClubCommentDto,
  ) {
    return this.clubCommentsService.create(id, user.sub, dto);
  }

  @Get(':id/my-points')
  @UseGuards(JwtAuthGuard)
  getMyPoints(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Query('month') month?: string,
  ) {
    return this.clubsService.getMyClubPoints(id, user.sub, month);
  }

  @Post(':id/rewards/:rewardId/redeem')
  @UseGuards(JwtAuthGuard)
  redeemReward(
    @Param('id') id: string,
    @Param('rewardId') rewardId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.clubsService.redeemReward(id, user.sub, rewardId);
  }

  @Get(':id/rankings')
  @UseGuards(JwtAuthGuard)
  getRankings(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Query('month') month?: string,
  ) {
    return this.clubsService.getInternalRanking(id, user.sub, month);
  }

  @Get(':id/promotions')
  @UseGuards(JwtAuthGuard)
  listPromotions(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.clubsService.listPromotions(id, user.sub);
  }

  @Post(':id/promotions')
  @UseGuards(JwtAuthGuard)
  createPromotion(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateClubPromotionDto,
  ) {
    return this.clubsService.createPromotion(id, user.sub, dto);
  }

  @Delete(':id/promotions/:promotionId')
  @UseGuards(JwtAuthGuard)
  deletePromotion(
    @Param('id') id: string,
    @Param('promotionId') promotionId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.clubsService.deletePromotion(id, user.sub, promotionId);
  }

  @Get(':id/rewards')
  @UseGuards(JwtAuthGuard)
  listRewards(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.clubsService.listRewards(id, user.sub);
  }

  @Post(':id/rewards')
  @UseGuards(JwtAuthGuard)
  createReward(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateClubRewardDto,
  ) {
    return this.clubsService.createReward(id, user.sub, dto);
  }

  @Get(':id/court-slots')
  @UseGuards(JwtAuthGuard)
  listCourtSlots(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.clubsService.listCourtSlots(id, user.sub);
  }

  @Post(':id/court-slots')
  @UseGuards(JwtAuthGuard)
  createCourtSlot(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateCourtSlotDto,
  ) {
    return this.clubsService.createCourtSlot(user.sub, id, dto);
  }

  @Delete(':id/court-slots/:slotId')
  @UseGuards(JwtAuthGuard)
  deleteCourtSlot(
    @Param('id') id: string,
    @Param('slotId') slotId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.clubsService.deleteCourtSlot(user.sub, id, slotId);
  }
}
