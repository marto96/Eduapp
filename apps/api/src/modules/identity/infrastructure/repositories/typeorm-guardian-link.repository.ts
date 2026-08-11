import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  GuardianLinkFilter,
  GuardianLinkRepositoryPort,
} from '../../application/ports/guardian-link.repository.port';
import { GuardianLink } from '../../domain/entities/guardian-link.entity';
import { GuardianLinkOrmEntity } from '../entities/guardian-link.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmGuardianLinkRepository extends GuardianLinkRepositoryPort {
  private readonly repo: Repository<GuardianLinkOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(GuardianLinkOrmEntity);
  }

  async findAll(filter?: GuardianLinkFilter): Promise<GuardianLink[]> {
    const rows = await this.repo.find({
      where: {
        ...(filter?.guardianUserId && { guardianUserId: filter.guardianUserId }),
        ...(filter?.studentUserId && { studentUserId: filter.studentUserId }),
      },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<GuardianLink | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async save(link: GuardianLink): Promise<void> {
    await this.repo.save({
      id: link.id,
      guardianUserId: link.guardianUserId,
      studentUserId: link.studentUserId,
      status: link.status,
    });
  }

  private toDomain(row: GuardianLinkOrmEntity): GuardianLink {
    return new GuardianLink(row.id, row.guardianUserId, row.studentUserId, row.status);
  }
}
