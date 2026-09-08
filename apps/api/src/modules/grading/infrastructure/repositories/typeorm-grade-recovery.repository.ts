import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  GradeRecoveryFilter,
  GradeRecoveryRepositoryPort,
} from '../../application/ports/grade-recovery.repository.port';
import { GradeRecovery } from '../../domain/entities/grade-recovery.entity';
import { GradeRecoveryOrmEntity } from '../entities/grade-recovery.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmGradeRecoveryRepository extends GradeRecoveryRepositoryPort {
  private readonly repo: Repository<GradeRecoveryOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(GradeRecoveryOrmEntity);
  }

  async findByKey(enrollmentId: string, subjectId: string, periodId: string): Promise<GradeRecovery | null> {
    const row = await this.repo.findOne({ where: { enrollmentId, subjectId, periodId } });
    return row ? this.toDomain(row) : null;
  }

  async findAll(filter?: GradeRecoveryFilter): Promise<GradeRecovery[]> {
    const rows = await this.repo.find({
      where: { ...(filter?.enrollmentId && { enrollmentId: filter.enrollmentId }) },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async upsert(recovery: GradeRecovery): Promise<void> {
    await this.repo.upsert(
      {
        id: recovery.id,
        enrollmentId: recovery.enrollmentId,
        subjectId: recovery.subjectId,
        periodId: recovery.periodId,
        score: recovery.score,
      },
      { conflictPaths: ['enrollmentId', 'subjectId', 'periodId'], skipUpdateIfNoValuesChanged: true },
    );
  }

  private toDomain(row: GradeRecoveryOrmEntity): GradeRecovery {
    return new GradeRecovery(row.id, row.enrollmentId, row.subjectId, row.periodId, row.score);
  }
}
