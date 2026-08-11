import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CurrentUser } from '../../../../core/auth/current-user.decorator';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { SendMessageUseCase } from '../../application/use-cases/send-message.use-case';
import { ListMessagesUseCase } from '../../application/use-cases/list-messages.use-case';
import { MarkMessageReadUseCase } from '../../application/use-cases/mark-message-read.use-case';
import { EditMessageUseCase } from '../../application/use-cases/edit-message.use-case';
import { CountUnreadMessagesUseCase } from '../../application/use-cases/count-unread-messages.use-case';
import { SendMessageDto } from '../dtos/send-message.dto';
import { EditMessageDto } from '../dtos/edit-message.dto';

@Controller('messages')
export class MessagesController {
  constructor(
    private readonly sendMessage: SendMessageUseCase,
    private readonly listMessages: ListMessagesUseCase,
    private readonly markMessageRead: MarkMessageReadUseCase,
    private readonly editMessage: EditMessageUseCase,
    private readonly countUnreadMessages: CountUnreadMessagesUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Message'))
  async create(@Body() dto: SendMessageDto, @CurrentUser() user: JwtPayload) {
    return this.sendMessage.execute({ ...dto, senderId: user.sub });
  }

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return this.listMessages.execute(user);
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: JwtPayload) {
    return { count: await this.countUnreadMessages.execute(user) };
  }

  @Patch(':id/read')
  @CheckPolicies((ability) => ability.can('update', 'Message'))
  async markRead(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.markMessageRead.execute(id, user);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can('update', 'Message'))
  async edit(@Param('id') id: string, @Body() dto: EditMessageDto, @CurrentUser() user: JwtPayload) {
    return this.editMessage.execute(id, dto.body, user);
  }
}
