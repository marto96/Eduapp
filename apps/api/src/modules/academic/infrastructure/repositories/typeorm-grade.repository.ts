import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { GradeRepositoryPort } from '../../application/ports/grade.repository.port';
import { Grade } from '../../domain/entities/grade.entity';
import { GradeOrmEntity } from '../entities/grade.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmGradeRepository extends GradeRepositoryPort {
  private readonly repo: Repository<GradeOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(GradeOrmEntity);
  }

  async findAll(): Promise<Grade[]> {
    const rows = await this.repo.find({ order: { order: 'ASC', name: 'ASC' } });
    return rows.map((row) => new Grade(row.id, row.name, row.level, row.order));
  }

  async findById(id: string): Promise<Grade | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? new Grade(row.id, row.name, row.level, row.order) : null;
  }

  async save(grade: Grade): Promise<void> {
    await this.repo.save({ id: grade.id, name: grade.name, level: grade.level, order: grade.order });
  }
}
