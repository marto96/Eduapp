import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AcademicYearRepositoryPort } from '../../application/ports/academic-year.repository.port';
import { AcademicYear } from '../../domain/entities/academic-year.entity';
import { AcademicYearOrmEntity } from '../entities/academic-year.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmAcademicYearRepository extends AcademicYearRepositoryPort {
  private readonly repo: Repository<AcademicYearOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(AcademicYearOrmEntity);
  }

  async findAll(): Promise<AcademicYear[]> {
    const rows = await this.repo.find({ order: { startDate: 'DESC' } });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<AcademicYear | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async save(year: AcademicYear): Promise<void> {
    await this.repo.save({
      id: year.id,
      name: year.name,
      startDate: year.startDate.toISOString().slice(0, 10),
      endDate: year.endDate.toISOString().slice(0, 10),
      status: year.status,
    });
  }

  private toDomain(row: AcademicYearOrmEntity): AcademicYear {
    return new AcademicYear(
      row.id,
      row.name,
      new Date(row.startDate),
      new Date(row.endDate),
      row.status,
    );
  }
}
