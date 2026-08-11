import { Inject, Injectable } from '@nestjs/common';
import {
  AnnouncementFilter,
  AnnouncementRepositoryPort,
} from '../ports/announcement.repository.port';
import { Announcement } from '../../domain/entities/announcement.entity';

@Injectable()
export class ListAnnouncementsUseCase {
  constructor(
    @Inject(AnnouncementRepositoryPort) private readonly announcements: AnnouncementRepositoryPort,
  ) {}

  async execute(filter?: AnnouncementFilter): Promise<Announcement[]> {
    return this.announcements.findAll(filter);
  }
}
