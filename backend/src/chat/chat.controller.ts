import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { SessionId } from '../common/decorators/session-id.decorator';
import { ChatService } from './chat.service';
import {
  ConversationResponse,
  PaginatedConversations,
  toConversationResponse,
} from './dto/conversation-response.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@Controller('conversations')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@SessionId() sessionId: string): Promise<ConversationResponse> {
    return toConversationResponse(await this.chat.create(sessionId));
  }

  @Get()
  async findAll(
    @SessionId() sessionId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedConversations> {
    const { items, total } = await this.chat.findAll(
      sessionId,
      query.page,
      query.limit,
    );

    return {
      data: items.map(toConversationResponse),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  @Get(':id')
  async findOne(
    @SessionId() sessionId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ConversationResponse> {
    return toConversationResponse(await this.chat.findOne(sessionId, id));
  }

  @Delete(':id')
  async remove(
    @SessionId() sessionId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.chat.softDelete(sessionId, id);
    return { message: 'Conversation deleted' };
  }
}
