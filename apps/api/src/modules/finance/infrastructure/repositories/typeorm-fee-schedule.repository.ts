import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { FeeScheduleRepositoryPort } from '../../application/ports/fee-schedule.repository.port';
import { FeeSchedule } from '../../domain/entities/fee-schedule.entity';
import { ChargeConcept } from '../../domain/entities/charge.entity';
import { FeeScheduleOrmEntity } from '../entities/fee-schedule.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmFeeScheduleRepository extends FeeScheduleRepositoryPort {
  private readonly repo: Repository<FeeScheduleOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(FeeScheduleOrmEntity);
  }

  async findAll(): Promise<FeeSchedule[]> {
    const rows = await this.repo.find({ order: { gradeId: 'ASC', academicYearId: 'ASC' } });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<FeeSchedule | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findOne(gradeId: string, academicYearId: string, concept: ChargeConcept): Promise<FeeSchedule | null> {
    const row = await this.repo.findOne({ where: { gradeId, academicYearId, concept } });
    return row ? this.toDomain(row) : null;
  }

  async save(feeSchedule: FeeSchedule): Promise<void> {
    await this.repo.save({
      id: feeSchedule.id,
      gradeId: feeSchedule.gradeId,
      academicYearId: feeSchedule.academicYearId,
      concept: feeSchedule.concept,
      amount: feeSchedule.amount,
    });
  }

  private toDomain(row: FeeScheduleOrmEntity): FeeSchedule {
    return new FeeSchedule(row.id, row.gradeId, row.academicYearId, row.concept, row.amount);
  }
}
