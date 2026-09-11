import { Module } from '@nestjs/common';
import { NotificationsController } from './interface/controllers/notifications.controller';
import { CreateNotificationUseCase } from './application/use-cases/create-notification.use-case';
import { ListMyNotificationsUseCase } from './application/use-cases/list-my-notifications.use-case';
import { CountUnreadNotificationsUseCase } from './application/use-cases/count-unread-notifications.use-case';
import { MarkNotificationReadUseCase } from './application/use-cases/mark-notification-read.use-case';
import { MarkAllNotificationsReadUseCase } from './application/use-cases/mark-all-notifications-read.use-case';
import { NotificationRepositoryPort } from './application/ports/notification.repository.port';
import { TypeOrmNotificationRepository } from './infrastructure/repositories/typeorm-notification.repository';

@Module({
  controllers: [NotificationsController],
  providers: [
    CreateNotificationUseCase,
    ListMyNotificationsUseCase,
    CountUnreadNotificationsUseCase,
    MarkNotificationReadUseCase,
    MarkAllNotificationsReadUseCase,
    { provide: NotificationRepositoryPort, useClass: TypeOrmNotificationRepository },
  ],
  exports: [CreateNotificationUseCase],
})
export class NotificationsModule {}
