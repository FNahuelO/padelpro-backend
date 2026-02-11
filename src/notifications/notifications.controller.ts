import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  async getMyNotifications(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.getMyNotifications(
      user.sub,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: any) {
    const count = await this.notificationsService.getUnreadCount(user.sub);
    return { count };
  }

  @Post(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    await this.notificationsService.markAsRead(id, user.sub);
    return { message: 'Notificación marcada como leída' };
  }

  @Post('read-all')
  async markAllAsRead(@CurrentUser() user: any) {
    await this.notificationsService.markAllAsRead(user.sub);
    return { message: 'Todas las notificaciones marcadas como leídas' };
  }
}

