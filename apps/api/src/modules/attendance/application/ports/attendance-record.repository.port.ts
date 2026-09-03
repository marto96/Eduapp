import { AttendanceRecord } from '../../domain/entities/attendance-record.entity';

export interface AttendanceFilter {
  sectionId?: string;
  academicYearId?: string;
  scheduleId?: string;
  date?: string;
  enrollmentId?: string;
}

export abstract class AttendanceRecordRepositoryPort {
  abstract findAll(filter?: AttendanceFilter): Promise<AttendanceRecord[]>;
  /** Upsert por (enrollmentId, scheduleId, date): si ya existe, actualiza el status. */
  abstract upsertMany(records: AttendanceRecord[]): Promise<void>;
}
