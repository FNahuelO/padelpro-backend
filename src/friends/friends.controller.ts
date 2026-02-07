import {
  Controller,
  Post,
  Get,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { FriendsService } from './friends.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private friendsService: FriendsService) {}

  @Post('request/:userId')
  async sendFriendRequest(
    @Param('userId') toUserId: string,
    @CurrentUser() user: any,
  ) {
    return this.friendsService.sendFriendRequest(user.sub, toUserId);
  }

  @Post('accept/:requestId')
  async acceptFriendRequest(
    @Param('requestId') requestId: string,
    @CurrentUser() user: any,
  ) {
    return this.friendsService.acceptFriendRequest(requestId, user.sub);
  }

  @Post('reject/:requestId')
  async rejectFriendRequest(
    @Param('requestId') requestId: string,
    @CurrentUser() user: any,
  ) {
    return this.friendsService.rejectFriendRequest(requestId, user.sub);
  }

  @Delete(':friendId')
  async deleteFriend(
    @Param('friendId') friendId: string,
    @CurrentUser() user: any,
  ) {
    return this.friendsService.deleteFriend(friendId, user.sub);
  }

  @Get()
  async getFriends(@CurrentUser() user: any) {
    return this.friendsService.getFriends(user.sub);
  }

  @Get('pending')
  async getPendingRequests(@CurrentUser() user: any) {
    return this.friendsService.getPendingRequests(user.sub);
  }
}

