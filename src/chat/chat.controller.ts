import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get(':matchId/messages')
  async getMessages(
    @Param('matchId') matchId: string,
    @CurrentUser() user: any,
  ) {
    return this.chatService.getMatchMessages(matchId, user.sub);
  }

  @Post(':matchId/messages')
  async sendMessage(
    @Param('matchId') matchId: string,
    @CurrentUser() user: any,
    @Body('content') content: string,
  ) {
    return this.chatService.createMessage(matchId, user.sub, content);
  }
}

