import { Inject, Injectable } from '@nestjs/common';
import { NotificationRepositoryPort } from '../ports/notification.repository.port';
import { Notification } from '../../domain/entities/notification.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

const RECENT_LIMIT = 20;

@Injectable()
export class ListMyNotificationsUseCase {
  constructor(@Inject(NotificationRepositoryPort) private readonly notifications: NotificationRepositoryPort) {}

  async execute(currentUser: JwtPayload): Promise<Notification[]> {
    return this.notifications.findRecentByRecipient(currentUser.sub, RECENT_LIMIT);
  }
}
