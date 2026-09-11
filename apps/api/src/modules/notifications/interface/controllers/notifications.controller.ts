import { Controller, Get, Param, Patch } from '@nestjs/common';
import { CurrentUser } from '../../../../core/auth/current-user.decorator';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { ListMyNotificationsUseCase } from '../../application/use-cases/list-my-notifications.use-case';
import { CountUnreadNotificationsUseCase } from '../../application/use-cases/count-unread-notifications.use-case';
import { MarkNotificationReadUseCase } from '../../application/use-cases/mark-notification-read.use-case';
import { MarkAllNotificationsReadUseCase } from '../../application/use-cases/mark-all-notifications-read.use-case';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly listMyNotifications: ListMyNotificationsUseCase,
    private readonly countUnread: CountUnreadNotificationsUseCase,
    private readonly markRead: MarkNotificationReadUseCase,
    private readonly markAllRead: MarkAllNotificationsReadUseCase,
  ) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return this.listMyNotifications.execute(user);
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: JwtPayload) {
    const count = await this.countUnread.execute(user);
    return { count };
  }

  @Patch(':id/read')
  async read(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.markRead.execute(id, user);
  }

  @Patch('read-all')
  async readAll(@CurrentUser() user: JwtPayload) {
    await this.markAllRead.execute(user);
    return { ok: true };
  }
}
