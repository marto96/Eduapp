import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  AnnouncementFilter,
  AnnouncementRepositoryPort,
} from '../../application/ports/announcement.repository.port';
import { Announcement } from '../../domain/entities/announcement.entity';
import { AnnouncementOrmEntity } from '../entities/announcement.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmAnnouncementRepository extends AnnouncementRepositoryPort {
  private readonly repo: Repository<AnnouncementOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(AnnouncementOrmEntity);
  }

  async findAll(filter?: AnnouncementFilter): Promise<Announcement[]> {
    const rows = await this.repo.find({
      where: {
        ...(filter?.category && { category: filter.category }),
      },
      order: { publishedAt: 'DESC' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<Announcement | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async save(announcement: Announcement): Promise<void> {
    await this.repo.save({
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      category: announcement.category,
      publishedAt: announcement.publishedAt,
      publishedBy: announcement.publishedBy,
      sectionId: announcement.sectionId,
      editedAt: announcement.editedAt ? new Date(announcement.editedAt) : null,
      voidedAt: announcement.voidedAt ? new Date(announcement.voidedAt) : null,
    });
  }

  private toDomain(row: AnnouncementOrmEntity): Announcement {
    return new Announcement(
      row.id,
      row.title,
      row.body,
      row.category,
      row.publishedAt,
      row.publishedBy,
      row.sectionId,
      row.editedAt ? row.editedAt.toISOString() : null,
      row.voidedAt ? row.voidedAt.toISOString() : null,
    );
  }
}
