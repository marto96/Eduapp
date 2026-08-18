import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AnnouncementReadRepositoryPort } from '../ports/announcement-read.repository.port';
import { AnnouncementRepositoryPort } from '../ports/announcement.repository.port';
import { AudienceAccessService } from '../services/audience-access.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

@Injectable()
export class MarkAnnouncementReadUseCase {
  constructor(
    @Inject(AnnouncementReadRepositoryPort) private readonly reads: AnnouncementReadRepositoryPort,
    @Inject(AnnouncementRepositoryPort) private readonly announcements: AnnouncementRepositoryPort,
    private readonly audienceAccess: AudienceAccessService,
  ) {}

  async execute(announcementId: string, currentUser: JwtPayload): Promise<void> {
    const announcement = await this.announcements.findById(announcementId);
    if (!announcement) {
      throw new NotFoundException('Comunicado no encontrado');
    }

    const visibleSectionIds = await this.audienceAccess.getVisibleSectionIds(currentUser);
    const isVisible =
      visibleSectionIds === null ||
      announcement.sectionId === null ||
      visibleSectionIds.has(announcement.sectionId);
    if (!isVisible) {
      throw new ForbiddenException('No tenés acceso a este comunicado');
    }

    await this.reads.markRead(announcementId, currentUser.sub);
  }
}
