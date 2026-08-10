import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ScheduleFilter, ScheduleRepositoryPort } from '../../application/ports/schedule.repository.port';
import { Schedule } from '../../domain/entities/schedule.entity';
import { ScheduleOrmEntity } from '../entities/schedule.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmScheduleRepository extends ScheduleRepositoryPort {
  private readonly repo: Repository<ScheduleOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(ScheduleOrmEntity);
  }

  async findAll(filter?: ScheduleFilter): Promise<Schedule[]> {
    const rows = await this.repo.find({
      where: {
        ...(filter?.sectionId && { sectionId: filter.sectionId }),
        ...(filter?.teacherId && { teacherId: filter.teacherId }),
        ...(filter?.academicYearId && { academicYearId: filter.academicYearId }),
        ...(filter?.dayOfWeek && { dayOfWeek: filter.dayOfWeek }),
      },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async save(schedule: Schedule): Promise<void> {
    await this.repo.save({
      id: schedule.id,
      sectionId: schedule.sectionId,
      subjectId: schedule.subjectId,
      teacherId: schedule.teacherId,
      academicYearId: schedule.academicYearId,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
    });
  }

  private toDomain(row: ScheduleOrmEntity): Schedule {
    return new Schedule(
      row.id,
      row.sectionId,
      row.subjectId,
      row.teacherId,
      row.academicYearId,
      row.dayOfWeek,
      row.startTime,
      row.endTime,
    );
  }
}
