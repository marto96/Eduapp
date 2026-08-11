import { Inject, Injectable } from '@nestjs/common';
import {
  AnnouncementFilter,
  AnnouncementRepositoryPort,
} from '../ports/announcement.repository.port';
import { Announcement } from '../../domain/entities/announcement.entity';
import { AudienceAccessService } from '../services/audience-access.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

@Injectable()
export class ListAnnouncementsUseCase {
  constructor(
    @Inject(AnnouncementRepositoryPort) private readonly announcements: AnnouncementRepositoryPort,
    private readonly audienceAccess: AudienceAccessService,
  ) {}

  async execute(filter: AnnouncementFilter | undefined, currentUser: JwtPayload): Promise<Announcement[]> {
    const all = await this.announcements.findAll(filter);
    const visibleSectionIds = await this.audienceAccess.getVisibleSectionIds(currentUser);
    if (visibleSectionIds === null) return all;
    return all.filter((a) => a.sectionId === null || visibleSectionIds.has(a.sectionId));
  }
}
