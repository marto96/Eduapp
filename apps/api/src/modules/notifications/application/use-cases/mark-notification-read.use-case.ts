import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationRepositoryPort } from '../ports/notification.repository.port';
import { Notification } from '../../domain/entities/notification.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

@Injectable()
export class MarkNotificationReadUseCase {
  constructor(@Inject(NotificationRepositoryPort) private readonly notifications: NotificationRepositoryPort) {}

  async execute(id: string, currentUser: JwtPayload): Promise<Notification> {
    const notification = await this.notifications.findById(id);
    if (!notification) {
      throw new NotFoundException(`No existe la notificación "${id}"`);
    }
    if (notification.recipientUserId !== currentUser.sub) {
      throw new ForbiddenException('Esta notificación no te pertenece');
    }
    notification.markRead();
    await this.notifications.save(notification);
    return notification;
  }
}
