import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { NotificationRepositoryPort } from '../ports/notification.repository.port';
import { Notification } from '../../domain/entities/notification.entity';

export interface CreateNotificationInput {
  recipientUserId: string;
  type: string;
  title: string;
  body: string;
  link: string;
}

@Injectable()
export class CreateNotificationUseCase {
  constructor(@Inject(NotificationRepositoryPort) private readonly notifications: NotificationRepositoryPort) {}

  async execute(input: CreateNotificationInput): Promise<Notification> {
    const notification = new Notification(
      randomUUID(),
      input.recipientUserId,
      input.type,
      input.title,
      input.body,
      input.link,
      new Date().toISOString(),
    );
    await this.notifications.save(notification);
    return notification;
  }
}
