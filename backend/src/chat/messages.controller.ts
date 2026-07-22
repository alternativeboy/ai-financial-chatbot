import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { SessionId } from '../common/decorators/session-id.decorator';
import {
  MessageResponse,
  toMessageResponse,
} from './dto/conversation-response.dto';
import { MessagesService } from './messages.service';

@Controller('conversations/:conversationId/messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  async findAll(
    @SessionId() sessionId: string,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ): Promise<MessageResponse[]> {
    const messages = await this.messages.findByConversation(
      sessionId,
      conversationId,
    );

    return messages.map(toMessageResponse);
  }
}
