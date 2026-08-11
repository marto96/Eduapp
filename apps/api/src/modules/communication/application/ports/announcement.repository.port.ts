import { Announcement, AnnouncementCategory } from '../../domain/entities/announcement.entity';

export interface AnnouncementFilter {
  category?: AnnouncementCategory;
}

export abstract class AnnouncementRepositoryPort {
  abstract findAll(filter?: AnnouncementFilter): Promise<Announcement[]>;
  abstract save(announcement: Announcement): Promise<void>;
}
