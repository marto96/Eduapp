import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { GradeWeightConfigRepositoryPort } from '../../application/ports/grade-weight-config.repository.port';
import { GradeWeightConfig } from '../../domain/entities/grade-weight-config.entity';
import { GradeWeightConfigOrmEntity } from '../entities/grade-weight-config.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmGradeWeightConfigRepository extends GradeWeightConfigRepositoryPort {
  private readonly repo: Repository<GradeWeightConfigOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(GradeWeightConfigOrmEntity);
  }

  async findFirst(): Promise<GradeWeightConfig | null> {
    const row = await this.repo.find({ take: 1 });
    return row[0] ? this.toDomain(row[0]) : null;
  }

  async save(config: GradeWeightConfig): Promise<void> {
    await this.repo.save({
      id: config.id,
      actividadWeight: config.actividadWeight,
      evaluacionBimestralWeight: config.evaluacionBimestralWeight,
      disciplinaWeight: config.disciplinaWeight,
    });
  }

  private toDomain(row: GradeWeightConfigOrmEntity): GradeWeightConfig {
    return new GradeWeightConfig(
      row.id,
      row.actividadWeight,
      row.evaluacionBimestralWeight,
      row.disciplinaWeight,
    );
  }
}
