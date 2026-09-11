import { Inject, Injectable } from '@nestjs/common';
import { DataSource, IsNull, Repository } from 'typeorm';
import { NotificationRepositoryPort } from '../../application/ports/notification.repository.port';
import { Notification } from '../../domain/entities/notification.entity';
import { NotificationOrmEntity } from '../entities/notification.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmNotificationRepository extends NotificationRepositoryPort {
  private readonly repo: Repository<NotificationOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(NotificationOrmEntity);
  }

  async findRecentByRecipient(recipientUserId: string, limit: number): Promise<Notification[]> {
    const rows = await this.repo.find({
      where: { recipientUserId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return rows.map((row) => this.toDomain(row));
  }

  async countUnreadByRecipient(recipientUserId: string): Promise<number> {
    return this.repo.count({ where: { recipientUserId, readAt: IsNull() } });
  }

  async findById(id: string): Promise<Notification | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findAllUnreadByRecipient(recipientUserId: string): Promise<Notification[]> {
    const rows = await this.repo.find({ where: { recipientUserId, readAt: IsNull() } });
    return rows.map((row) => this.toDomain(row));
  }

  async save(notification: Notification): Promise<void> {
    await this.repo.save({
      id: notification.id,
      recipientUserId: notification.recipientUserId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      link: notification.link,
      createdAt: new Date(notification.createdAt),
      readAt: notification.readAt ? new Date(notification.readAt) : null,
    });
  }

  async saveMany(notifications: Notification[]): Promise<void> {
    await this.repo.save(
      notifications.map((n) => ({
        id: n.id,
        recipientUserId: n.recipientUserId,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        createdAt: new Date(n.createdAt),
        readAt: n.readAt ? new Date(n.readAt) : null,
      })),
    );
  }

  private toDomain(row: NotificationOrmEntity): Notification {
    return new Notification(
      row.id,
      row.recipientUserId,
      row.type,
      row.title,
      row.body,
      row.link,
      row.createdAt.toISOString(),
      row.readAt ? row.readAt.toISOString() : null,
    );
  }
}
