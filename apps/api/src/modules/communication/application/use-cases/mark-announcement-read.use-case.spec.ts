import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MarkAnnouncementReadUseCase } from './mark-announcement-read.use-case';
import { AnnouncementReadRepositoryPort } from '../ports/announcement-read.repository.port';
import { AnnouncementRepositoryPort } from '../ports/announcement.repository.port';
import { AudienceAccessService } from '../services/audience-access.service';
import { Announcement } from '../../domain/entities/announcement.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

describe('MarkAnnouncementReadUseCase', () => {
  const reads: jest.Mocked<AnnouncementReadRepositoryPort> = {
    markRead: jest.fn(),
    findByAnnouncement: jest.fn(),
  };
  const announcements: jest.Mocked<AnnouncementRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };
  const audienceAccess = { getVisibleSectionIds: jest.fn() } as unknown as jest.Mocked<AudienceAccessService>;

  const useCase = new MarkAnnouncementReadUseCase(reads, announcements, audienceAccess);

  const user: JwtPayload = { sub: 'user-1', email: 'x@x.com', roles: ['estudiante'], tenantId: 't1' };

  beforeEach(() => jest.clearAllMocks());

  it('lanza NotFoundException si el comunicado no existe', async () => {
    announcements.findById.mockResolvedValue(null);

    await expect(useCase.execute('ann-1', user)).rejects.toThrow(NotFoundException);
    expect(reads.markRead).not.toHaveBeenCalled();
  });

  it('lanza ForbiddenException si el comunicado está segmentado a una sección que el usuario no puede ver', async () => {
    const announcement = new Announcement('ann-1', 'T', 'B', 'comunicado', '2026-01-01', 'admin-1', 'section-B');
    announcements.findById.mockResolvedValue(announcement);
    audienceAccess.getVisibleSectionIds.mockResolvedValue(new Set(['section-A']));

    await expect(useCase.execute('ann-1', user)).rejects.toThrow(ForbiddenException);
    expect(reads.markRead).not.toHaveBeenCalled();
  });

  it('marca como leído si el comunicado es institucional (sectionId null)', async () => {
    const announcement = new Announcement('ann-1', 'T', 'B', 'comunicado', '2026-01-01', 'admin-1', null);
    announcements.findById.mockResolvedValue(announcement);
    audienceAccess.getVisibleSectionIds.mockResolvedValue(new Set(['section-A']));

    await useCase.execute('ann-1', user);

    expect(reads.markRead).toHaveBeenCalledWith('ann-1', 'user-1');
  });

  it('marca como leído si el usuario tiene visible la sección del comunicado', async () => {
    const announcement = new Announcement('ann-1', 'T', 'B', 'comunicado', '2026-01-01', 'admin-1', 'section-A');
    announcements.findById.mockResolvedValue(announcement);
    audienceAccess.getVisibleSectionIds.mockResolvedValue(new Set(['section-A']));

    await useCase.execute('ann-1', user);

    expect(reads.markRead).toHaveBeenCalledWith('ann-1', 'user-1');
  });

  it('marca como leído sin restricción para roles de staff (visibleSectionIds null)', async () => {
    const announcement = new Announcement('ann-1', 'T', 'B', 'comunicado', '2026-01-01', 'admin-1', 'section-B');
    announcements.findById.mockResolvedValue(announcement);
    audienceAccess.getVisibleSectionIds.mockResolvedValue(null);

    await useCase.execute('ann-1', user);

    expect(reads.markRead).toHaveBeenCalledWith('ann-1', 'user-1');
  });
});
