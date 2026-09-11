import { Notification } from '../../domain/entities/notification.entity';

export abstract class NotificationRepositoryPort {
  /** Las más recientes primero, como máximo `limit`. */
  abstract findRecentByRecipient(recipientUserId: string, limit: number): Promise<Notification[]>;
  abstract countUnreadByRecipient(recipientUserId: string): Promise<number>;
  abstract findById(id: string): Promise<Notification | null>;
  abstract findAllUnreadByRecipient(recipientUserId: string): Promise<Notification[]>;
  abstract save(notification: Notification): Promise<void>;
  abstract saveMany(notifications: Notification[]): Promise<void>;
}
