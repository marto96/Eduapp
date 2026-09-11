import { Inject, Injectable } from '@nestjs/common';
import { NotificationRepositoryPort } from '../ports/notification.repository.port';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

@Injectable()
export class MarkAllNotificationsReadUseCase {
  constructor(@Inject(NotificationRepositoryPort) private readonly notifications: NotificationRepositoryPort) {}

  async execute(currentUser: JwtPayload): Promise<void> {
    const unread = await this.notifications.findAllUnreadByRecipient(currentUser.sub);
    unread.forEach((n) => n.markRead());
    if (unread.length > 0) {
      await this.notifications.saveMany(unread);
    }
  }
}
