import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Res,
  Sse,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import type Redis from 'ioredis';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CurrentUser } from '../../../../core/auth/current-user.decorator';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { REDIS_CLIENT } from '../../../../core/cache/redis.module';
import { AuditSkip } from '../../../audit/interface/decorators/audit-skip.decorator';
import { SendMessageUseCase } from '../../application/use-cases/send-message.use-case';
import { ListMessagesUseCase } from '../../application/use-cases/list-messages.use-case';
import { MarkMessageReadUseCase } from '../../application/use-cases/mark-message-read.use-case';
import { EditMessageUseCase } from '../../application/use-cases/edit-message.use-case';
import { DeleteMessageUseCase } from '../../application/use-cases/delete-message.use-case';
import { CountUnreadMessagesUseCase } from '../../application/use-cases/count-unread-messages.use-case';
import { AddMessageAttachmentUseCase } from '../../application/use-cases/add-message-attachment.use-case';
import { GetMessageAttachmentUseCase } from '../../application/use-cases/get-message-attachment.use-case';
import { SendMessageDto } from '../dtos/send-message.dto';
import { EditMessageDto } from '../dtos/edit-message.dto';

const ALLOWED_ATTACHMENT_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

@Controller('messages')
export class MessagesController {
  constructor(
    private readonly sendMessage: SendMessageUseCase,
    private readonly listMessages: ListMessagesUseCase,
    private readonly markMessageRead: MarkMessageReadUseCase,
    private readonly editMessage: EditMessageUseCase,
    private readonly deleteMessage: DeleteMessageUseCase,
    private readonly countUnreadMessages: CountUnreadMessagesUseCase,
    private readonly addMessageAttachment: AddMessageAttachmentUseCase,
    private readonly getMessageAttachment: GetMessageAttachmentUseCase,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
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

  /**
   * SSE: notifica al destinatario cuando le llega un mensaje nuevo, sin
   * polling. Cada conexión abre su propia conexión Redis duplicada para
   * suscribirse al canal `messages:<userId>` — ioredis no permite mandar
   * otros comandos por una conexión ya en modo `subscribe`.
   */
  @Sse('stream')
  stream(@CurrentUser() user: JwtPayload): Observable<{ data: string }> {
    return new Observable((subscriber) => {
      const channel = `messages:${user.sub}`;
      const subscriberClient = this.redis.duplicate();

      subscriberClient.subscribe(channel).catch((err) => subscriber.error(err));
      subscriberClient.on('message', (_channel, message) => {
        subscriber.next({ data: message });
      });

      return () => {
        subscriberClient.unsubscribe(channel).catch(() => undefined);
        subscriberClient.quit().catch(() => undefined);
      };
    });
  }

  @Patch(':id/read')
  @AuditSkip()
  @CheckPolicies((ability) => ability.can('update', 'Message'))
  async markRead(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.markMessageRead.execute(id, user);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can('update', 'Message'))
  async edit(@Param('id') id: string, @Body() dto: EditMessageDto, @CurrentUser() user: JwtPayload) {
    return this.editMessage.execute(id, dto.body, user);
  }

  @Delete(':id')
  @CheckPolicies((ability) => ability.can('update', 'Message'))
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.deleteMessage.execute(id, user);
    return { ok: true };
  }

  @Post(':id/attachment')
  @CheckPolicies((ability) => ability.can('update', 'Message'))
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok = ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.mimetype);
        cb(ok ? null : new BadRequestException('Formato de adjunto no soportado'), ok);
      },
    }),
  )
  async uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.addMessageAttachment.execute(
      id,
      { buffer: file.buffer, originalname: file.originalname, mimetype: file.mimetype },
      user,
    );
  }

  @Get(':id/attachment')
  async downloadAttachment(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.getMessageAttachment.execute(id, user);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
