import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  GradeScoreFilter,
  GradeScoreRepositoryPort,
} from '../../application/ports/grade-score.repository.port';
import { GradeScore } from '../../domain/entities/grade-score.entity';
import { GradeScoreOrmEntity } from '../entities/grade-score.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmGradeScoreRepository extends GradeScoreRepositoryPort {
  private readonly repo: Repository<GradeScoreOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(GradeScoreOrmEntity);
  }

  async findAll(filter?: GradeScoreFilter): Promise<GradeScore[]> {
    const rows = await this.repo.find({
      where: {
        ...(filter?.evaluationId && { evaluationId: filter.evaluationId }),
        ...(filter?.enrollmentId && { enrollmentId: filter.enrollmentId }),
      },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async upsertMany(scores: GradeScore[]): Promise<void> {
    if (scores.length === 0) return;
    await this.repo.upsert(
      scores.map((s) => ({
        id: s.id,
        evaluationId: s.evaluationId,
        enrollmentId: s.enrollmentId,
        score: s.score,
      })),
      { conflictPaths: ['evaluationId', 'enrollmentId'], skipUpdateIfNoValuesChanged: true },
    );
  }

  private toDomain(row: GradeScoreOrmEntity): GradeScore {
    return new GradeScore(row.id, row.evaluationId, row.enrollmentId, row.score);
  }
}
