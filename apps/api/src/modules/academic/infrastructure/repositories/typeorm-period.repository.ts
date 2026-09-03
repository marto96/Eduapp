import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PeriodFilter, PeriodRepositoryPort } from '../../application/ports/period.repository.port';
import { Period } from '../../domain/entities/period.entity';
import { PeriodOrmEntity } from '../entities/period.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmPeriodRepository extends PeriodRepositoryPort {
  private readonly repo: Repository<PeriodOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(PeriodOrmEntity);
  }

  async findAll(filter?: PeriodFilter): Promise<Period[]> {
    const rows = await this.repo.find({
      where: { ...(filter?.academicYearId && { academicYearId: filter.academicYearId }) },
      order: { order: 'ASC' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<Period | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async save(period: Period): Promise<void> {
    await this.repo.save({
      id: period.id,
      academicYearId: period.academicYearId,
      name: period.name,
      order: period.order,
      weight: period.weight,
      startDate: period.startDate,
      endDate: period.endDate,
    });
  }

  private toDomain(row: PeriodOrmEntity): Period {
    return new Period(row.id, row.academicYearId, row.name, row.order, row.weight, row.startDate, row.endDate);
  }
}
