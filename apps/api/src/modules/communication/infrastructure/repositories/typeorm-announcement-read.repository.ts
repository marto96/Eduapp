import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  AnnouncementReadRepositoryPort,
  AnnouncementReadRow,
} from '../../application/ports/announcement-read.repository.port';
import { AnnouncementReadOrmEntity } from '../entities/announcement-read.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmAnnouncementReadRepository extends AnnouncementReadRepositoryPort {
  private readonly repo: Repository<AnnouncementReadOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(AnnouncementReadOrmEntity);
  }

  async markRead(announcementId: string, userId: string): Promise<void> {
    await this.repo.upsert(
      { announcementId, userId },
      { conflictPaths: ['announcementId', 'userId'], skipUpdateIfNoValuesChanged: true },
    );
  }

  async findByAnnouncement(announcementId: string): Promise<AnnouncementReadRow[]> {
    const rows = await this.repo.find({ where: { announcementId } });
    return rows.map((row) => ({
      announcementId: row.announcementId,
      userId: row.userId,
      readAt: row.readAt.toISOString(),
    }));
  }
}
