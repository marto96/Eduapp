import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  EvaluationFilter,
  EvaluationRepositoryPort,
} from '../../application/ports/evaluation.repository.port';
import { Evaluation } from '../../domain/entities/evaluation.entity';
import { EvaluationOrmEntity } from '../entities/evaluation.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmEvaluationRepository extends EvaluationRepositoryPort {
  private readonly repo: Repository<EvaluationOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(EvaluationOrmEntity);
  }

  async findAll(filter?: EvaluationFilter): Promise<Evaluation[]> {
    const rows = await this.repo.find({
      where: {
        ...(filter?.sectionId && { sectionId: filter.sectionId }),
        ...(filter?.academicYearId && { academicYearId: filter.academicYearId }),
        ...(filter?.subjectId && { subjectId: filter.subjectId }),
      },
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<Evaluation | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async save(evaluation: Evaluation): Promise<void> {
    await this.repo.save({
      id: evaluation.id,
      subjectId: evaluation.subjectId,
      sectionId: evaluation.sectionId,
      academicYearId: evaluation.academicYearId,
      period: evaluation.period,
      type: evaluation.type,
      maxScore: evaluation.maxScore,
    });
  }

  private toDomain(row: EvaluationOrmEntity): Evaluation {
    return new Evaluation(
      row.id,
      row.subjectId,
      row.sectionId,
      row.academicYearId,
      row.period,
      row.type,
      row.maxScore,
    );
  }
}
