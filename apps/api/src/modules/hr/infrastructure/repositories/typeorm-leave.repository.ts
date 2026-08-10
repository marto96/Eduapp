import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { LeaveFilter, LeaveRepositoryPort } from '../../application/ports/leave.repository.port';
import { Leave } from '../../domain/entities/leave.entity';
import { LeaveOrmEntity } from '../entities/leave.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmLeaveRepository extends LeaveRepositoryPort {
  private readonly repo: Repository<LeaveOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(LeaveOrmEntity);
  }

  async findAll(filter?: LeaveFilter): Promise<Leave[]> {
    const rows = await this.repo.find({
      where: {
        ...(filter?.employeeId && { employeeId: filter.employeeId }),
      },
      order: { startDate: 'ASC' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async save(leave: Leave): Promise<void> {
    await this.repo.save({
      id: leave.id,
      employeeId: leave.employeeId,
      type: leave.type,
      startDate: leave.startDate,
      endDate: leave.endDate,
      reason: leave.reason ?? null,
    });
  }

  private toDomain(row: LeaveOrmEntity): Leave {
    return new Leave(row.id, row.employeeId, row.type, row.startDate, row.endDate, row.reason ?? undefined);
  }
}
