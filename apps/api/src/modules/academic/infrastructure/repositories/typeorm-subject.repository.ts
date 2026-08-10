import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SubjectRepositoryPort } from '../../application/ports/subject.repository.port';
import { Subject } from '../../domain/entities/subject.entity';
import { SubjectOrmEntity } from '../entities/subject.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmSubjectRepository extends SubjectRepositoryPort {
  private readonly repo: Repository<SubjectOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(SubjectOrmEntity);
  }

  async findAll(): Promise<Subject[]> {
    const rows = await this.repo.find({ order: { name: 'ASC' } });
    return rows.map((row) => new Subject(row.id, row.name, row.area));
  }

  async save(subject: Subject): Promise<void> {
    await this.repo.save({ id: subject.id, name: subject.name, area: subject.area });
  }
}
