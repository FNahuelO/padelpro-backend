import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ClubCommentsService } from './club-comments.service';
import { ClubsService } from './clubs.service';
import { CreateClubCommentDto } from './dto/create-club-comment.dto';
import { CreateClubDto } from './dto/create-club.dto';
import { CreateClubPromotionDto } from './dto/create-club-promotion.dto';
import { CreateClubRewardDto } from './dto/create-club-reward.dto';
import { UpdateClubRewardDto } from './dto/update-club-reward.dto';
import { CreateCourtSlotDto } from './dto/create-court-slot.dto';
import { CreateShopCouponDto } from './dto/create-shop-coupon.dto';
import { CreateShopProductDto } from './dto/create-shop-product.dto';
import { UpdateShopProductDto } from './dto/update-shop-product.dto';
import { UpdateCourtSlotDto } from './dto/update-court-slot.dto';
import { UpdateShopStockDto } from './dto/update-shop-stock.dto';
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

  @Get('available')
  @UseGuards(JwtAuthGuard)
  findAvailable(
    @Query('date') date?: string,
    @Query('startHour') startHour?: string,
    @Query('endHour') endHour?: string,
  ) {
    return this.clubsService.findAvailableForWindow(
      date ?? '',
      startHour != null ? Number(startHour) : NaN,
      endHour != null ? Number(endHour) : NaN,
    );
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

  @Get(':id/impact')
  @UseGuards(JwtAuthGuard)
  getImpact(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.clubsService.getClubImpact(id, user.sub);
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

  @Get(':id/revenue')
  @UseGuards(JwtAuthGuard)
  getRevenue(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Query('days') days?: string,
    @Query('movementsLimit') movementsLimit?: string,
  ) {
    const periodDays = days != null ? parseInt(days, 10) : 30;
    const parsedMovementsLimit =
      movementsLimit != null ? parseInt(movementsLimit, 10) : 15;
    return this.clubsService.getRevenue(
      id,
      user.sub,
      Number.isFinite(periodDays) ? periodDays : 30,
      Number.isFinite(parsedMovementsLimit) ? parsedMovementsLimit : 15,
    );
  }

  @Get(':id/rankings')
  @UseGuards(JwtAuthGuard)
  getRankings(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Query('period') period?: 'weekly' | 'monthly' | 'annual',
    @Query('month') month?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = parseInt(limit || '20', 10);
    const safePeriod = period === 'weekly' || period === 'annual' ? period : 'monthly';
    return this.clubsService.getInternalRanking(
      id,
      user.sub,
      safePeriod,
      month,
      Number.isFinite(parsedLimit) ? parsedLimit : 20,
    );
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

  @Get(':id/rewards/redemptions')
  @UseGuards(JwtAuthGuard)
  listRewardRedemptions(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.clubsService.listRewardRedemptions(id, user.sub);
  }

  @Patch(':id/rewards/:rewardId')
  @UseGuards(JwtAuthGuard)
  updateReward(
    @Param('id') id: string,
    @Param('rewardId') rewardId: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: UpdateClubRewardDto,
  ) {
    return this.clubsService.updateReward(id, user.sub, rewardId, dto);
  }

  @Get(':id/shop/products/manage')
  @UseGuards(JwtAuthGuard)
  listShopProductsManage(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.clubsService.listShopProductsManage(id, user.sub);
  }

  @Get(':id/shop/products')
  listShopProducts(
    @Param('id') id: string,
    @Query('kind') kind?: string,
    @Query('matchExtra') matchExtra?: string,
  ) {
    const matchExtraOnly = matchExtra === 'true' || matchExtra === '1' || kind === 'MATCH_ADDON';
    return this.clubsService.listShopProducts(id, { matchExtraOnly });
  }

  @Post(':id/shop/products')
  @UseGuards(JwtAuthGuard)
  createShopProduct(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateShopProductDto,
  ) {
    return this.clubsService.createShopProduct(id, user.sub, dto);
  }

  @Patch(':id/shop/products/:productId')
  @UseGuards(JwtAuthGuard)
  updateShopProduct(
    @Param('id') id: string,
    @Param('productId') productId: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: UpdateShopProductDto,
  ) {
    return this.clubsService.updateShopProduct(id, user.sub, productId, dto);
  }

  @Patch(':id/shop/products/:productId/stock')
  @UseGuards(JwtAuthGuard)
  updateShopProductStock(
    @Param('id') id: string,
    @Param('productId') productId: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: UpdateShopStockDto,
  ) {
    return this.clubsService.updateShopProductStock(id, user.sub, productId, dto);
  }

  @Delete(':id/shop/products/:productId')
  @UseGuards(JwtAuthGuard)
  deactivateShopProduct(
    @Param('id') id: string,
    @Param('productId') productId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.clubsService.deactivateShopProduct(id, user.sub, productId);
  }

  @Get(':id/shop/sales')
  @UseGuards(JwtAuthGuard)
  listShopSales(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.clubsService.listShopSales(id, user.sub);
  }

  @Get(':id/shop/coupons')
  @UseGuards(JwtAuthGuard)
  listShopCoupons(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.clubsService.listShopCoupons(id, user.sub);
  }

  @Post(':id/shop/coupons')
  @UseGuards(JwtAuthGuard)
  createShopCoupon(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateShopCouponDto,
  ) {
    return this.clubsService.createShopCoupon(id, user.sub, dto);
  }

  @Delete(':id/shop/coupons/:couponId')
  @UseGuards(JwtAuthGuard)
  deactivateShopCoupon(
    @Param('id') id: string,
    @Param('couponId') couponId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.clubsService.deactivateShopCoupon(id, user.sub, couponId);
  }

  @Get(':id/court-slots')
  @UseGuards(JwtAuthGuard)
  listCourtSlots(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.clubsService.listCourtSlots(id, user.sub);
  }

  @Get(':id/matches')
  @UseGuards(JwtAuthGuard)
  listClubMatches(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.clubsService.listClubMatches(id, user.sub);
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

  @Patch(':id/court-slots/:slotId')
  @UseGuards(JwtAuthGuard)
  updateCourtSlot(
    @Param('id') id: string,
    @Param('slotId') slotId: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: UpdateCourtSlotDto,
  ) {
    return this.clubsService.updateCourtSlot(user.sub, id, slotId, dto);
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
