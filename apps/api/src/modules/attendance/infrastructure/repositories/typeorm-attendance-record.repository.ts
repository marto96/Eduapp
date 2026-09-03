import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  AttendanceFilter,
  AttendanceRecordRepositoryPort,
} from '../../application/ports/attendance-record.repository.port';
import { AttendanceRecord } from '../../domain/entities/attendance-record.entity';
import { AttendanceRecordOrmEntity } from '../entities/attendance-record.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmAttendanceRecordRepository extends AttendanceRecordRepositoryPort {
  private readonly repo: Repository<AttendanceRecordOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) private readonly dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(AttendanceRecordOrmEntity);
  }

  async findAll(filter?: AttendanceFilter): Promise<AttendanceRecord[]> {
    const query = this.repo.createQueryBuilder('ar').orderBy('ar.date', 'DESC');

    if (filter?.sectionId || filter?.academicYearId) {
      query.innerJoin('enrollments', 'e', 'e.id = ar.enrollment_id');
      if (filter.sectionId) query.andWhere('e.section_id = :sectionId', filter);
      if (filter.academicYearId) {
        query.andWhere('e.academic_year_id = :academicYearId', filter);
      }
    }
    if (filter?.enrollmentId) {
      query.andWhere('ar.enrollment_id = :enrollmentId', filter);
    }
    if (filter?.scheduleId) {
      query.andWhere('ar.schedule_id = :scheduleId', filter);
    }
    if (filter?.date) {
      query.andWhere('ar.date = :date', filter);
    }

    const rows = await query.getMany();
    return rows.map((row) => this.toDomain(row));
  }

  async upsertMany(records: AttendanceRecord[]): Promise<void> {
    if (records.length === 0) return;
    await this.repo.upsert(
      records.map((r) => ({
        id: r.id,
        enrollmentId: r.enrollmentId,
        scheduleId: r.scheduleId,
        date: r.date,
        status: r.status,
      })),
      { conflictPaths: ['enrollmentId', 'scheduleId', 'date'], skipUpdateIfNoValuesChanged: true },
    );
  }

  private toDomain(row: AttendanceRecordOrmEntity): AttendanceRecord {
    return new AttendanceRecord(row.id, row.enrollmentId, row.scheduleId, row.date, row.status);
  }
}
