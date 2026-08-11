import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { AnnouncementRepositoryPort } from '../ports/announcement.repository.port';
import { Announcement, AnnouncementCategory } from '../../domain/entities/announcement.entity';

export interface PublishAnnouncementInput {
  title: string;
  body: string;
  category: AnnouncementCategory;
  publishedAt: string;
  publishedBy: string;
  sectionId?: string;
}

@Injectable()
export class PublishAnnouncementUseCase {
  constructor(
    @Inject(AnnouncementRepositoryPort) private readonly announcements: AnnouncementRepositoryPort,
  ) {}

  async execute(input: PublishAnnouncementInput): Promise<Announcement> {
    const announcement = new Announcement(
      randomUUID(),
      input.title,
      input.body,
      input.category,
      input.publishedAt,
      input.publishedBy,
      input.sectionId ?? null,
    );

    await this.announcements.save(announcement);
    return announcement;
  }
}
