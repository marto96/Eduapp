import { Inject, Injectable } from '@nestjs/common';
import { AnnouncementReadRepositoryPort } from '../ports/announcement-read.repository.port';

@Injectable()
export class MarkAnnouncementReadUseCase {
  constructor(
    @Inject(AnnouncementReadRepositoryPort) private readonly reads: AnnouncementReadRepositoryPort,
  ) {}

  async execute(announcementId: string, userId: string): Promise<void> {
    await this.reads.markRead(announcementId, userId);
  }
}
