import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClassroomRepositoryPort } from '../../application/ports/classroom.repository.port';
import { Classroom } from '../../domain/entities/classroom.entity';
import { ClassroomOrmEntity } from '../entities/classroom.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmClassroomRepository extends ClassroomRepositoryPort {
  private readonly repo: Repository<ClassroomOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(ClassroomOrmEntity);
  }

  async findAll(): Promise<Classroom[]> {
    const rows = await this.repo.find({ order: { name: 'ASC' } });
    return rows.map((row) => new Classroom(row.id, row.name, row.capacity));
  }

  async save(classroom: Classroom): Promise<void> {
    await this.repo.save({ id: classroom.id, name: classroom.name, capacity: classroom.capacity });
  }
}
