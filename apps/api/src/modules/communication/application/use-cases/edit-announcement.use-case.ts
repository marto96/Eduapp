import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AnnouncementRepositoryPort } from '../ports/announcement.repository.port';
import { Announcement } from '../../domain/entities/announcement.entity';

@Injectable()
export class EditAnnouncementUseCase {
  constructor(
    @Inject(AnnouncementRepositoryPort) private readonly announcements: AnnouncementRepositoryPort,
  ) {}

  async execute(
    id: string,
    title: string,
    body: string,
    sectionId: string | null,
  ): Promise<Announcement> {
    const announcement = await this.announcements.findById(id);
    if (!announcement) {
      throw new NotFoundException(`No existe el comunicado "${id}"`);
    }
    if (announcement.voidedAt) {
      throw new ConflictException('No se puede editar un comunicado anulado');
    }

    announcement.edit(title, body, sectionId);
    await this.announcements.save(announcement);
    return announcement;
  }
}
