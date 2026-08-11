import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AnnouncementRepositoryPort } from '../ports/announcement.repository.port';
import { Announcement } from '../../domain/entities/announcement.entity';

@Injectable()
export class VoidAnnouncementUseCase {
  constructor(
    @Inject(AnnouncementRepositoryPort) private readonly announcements: AnnouncementRepositoryPort,
  ) {}

  async execute(id: string): Promise<Announcement> {
    const announcement = await this.announcements.findById(id);
    if (!announcement) {
      throw new NotFoundException(`No existe el comunicado "${id}"`);
    }
    if (announcement.voidedAt) {
      throw new ConflictException('El comunicado ya está anulado');
    }

    announcement.markVoided();
    await this.announcements.save(announcement);
    return announcement;
  }
}
