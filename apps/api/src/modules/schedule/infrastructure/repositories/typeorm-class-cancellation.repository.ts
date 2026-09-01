import { Inject, Injectable } from '@nestjs/common';
import { Between, DataSource, In, Repository } from 'typeorm';
import { ClassCancellationRepositoryPort } from '../../application/ports/class-cancellation.repository.port';
import { ClassCancellation } from '../../domain/entities/class-cancellation.entity';
import { ClassCancellationOrmEntity } from '../entities/class-cancellation.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmClassCancellationRepository extends ClassCancellationRepositoryPort {
  private readonly repo: Repository<ClassCancellationOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(ClassCancellationOrmEntity);
  }

  async findOne(scheduleId: string, date: string): Promise<ClassCancellation | null> {
    const row = await this.repo.findOne({ where: { scheduleId, date } });
    return row ? this.toDomain(row) : null;
  }

  async findByScheduleIds(scheduleIds: string[], from: string, to: string): Promise<ClassCancellation[]> {
    if (scheduleIds.length === 0) return [];
    const rows = await this.repo.find({
      where: { scheduleId: In(scheduleIds), date: Between(from, to) },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<ClassCancellation | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async save(cancellation: ClassCancellation): Promise<void> {
    await this.repo.save({
      id: cancellation.id,
      scheduleId: cancellation.scheduleId,
      date: cancellation.date,
      cancelledBy: cancellation.cancelledBy,
      reason: cancellation.reason,
    });
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete({ id });
  }

  private toDomain(row: ClassCancellationOrmEntity): ClassCancellation {
    return new ClassCancellation(row.id, row.scheduleId, row.date, row.cancelledBy, row.reason);
  }
}
