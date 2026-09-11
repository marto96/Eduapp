import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MarkNotificationReadUseCase } from './mark-notification-read.use-case';
import { NotificationRepositoryPort } from '../ports/notification.repository.port';
import { Notification } from '../../domain/entities/notification.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

describe('MarkNotificationReadUseCase', () => {
  const notifications: jest.Mocked<NotificationRepositoryPort> = {
    findRecentByRecipient: jest.fn(),
    countUnreadByRecipient: jest.fn(),
    findById: jest.fn(),
    findAllUnreadByRecipient: jest.fn(),
    save: jest.fn(),
    saveMany: jest.fn(),
  };

  const useCase = new MarkNotificationReadUseCase(notifications);

  function user(sub: string): JwtPayload {
    return { sub, email: 'u@x.com', roles: ['secretaria'], tenantId: 't1' };
  }

  beforeEach(() => jest.clearAllMocks());

  it('lanza NotFoundException si la notificación no existe', async () => {
    notifications.findById.mockResolvedValue(null);
    await expect(useCase.execute('n1', user('user-1'))).rejects.toThrow(NotFoundException);
  });

  it('lanza ForbiddenException si la notificación es de otro usuario', async () => {
    notifications.findById.mockResolvedValue(
      new Notification('n1', 'otro-user', 'x', 'T', 'B', '/x', '2026-09-11T00:00:00.000Z'),
    );
    await expect(useCase.execute('n1', user('user-1'))).rejects.toThrow(ForbiddenException);
  });

  it('marca como leída la notificación propia', async () => {
    const notification = new Notification('n1', 'user-1', 'x', 'T', 'B', '/x', '2026-09-11T00:00:00.000Z');
    notifications.findById.mockResolvedValue(notification);
    const result = await useCase.execute('n1', user('user-1'));
    expect(result.readAt).not.toBeNull();
    expect(notifications.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'n1' }));
  });
});
