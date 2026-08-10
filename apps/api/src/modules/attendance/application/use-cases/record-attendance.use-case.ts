import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AttendanceRecordRepositoryPort } from '../ports/attendance-record.repository.port';
import { AttendanceRecord, AttendanceStatus } from '../../domain/entities/attendance-record.entity';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';

export interface RecordAttendanceEntry {
  enrollmentId: string;
  status: AttendanceStatus;
}

export interface RecordAttendanceInput {
  sectionId: string;
  academicYearId: string;
  date: string;
  records: RecordAttendanceEntry[];
}

@Injectable()
export class RecordAttendanceUseCase {
  constructor(
    @Inject(AttendanceRecordRepositoryPort)
    private readonly attendance: AttendanceRecordRepositoryPort,
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
  ) {}

  async execute(input: RecordAttendanceInput): Promise<AttendanceRecord[]> {
    const sectionEnrollments = await this.enrollments.findAll({
      sectionId: input.sectionId,
      academicYearId: input.academicYearId,
    });
    const validEnrollmentIds = new Set(sectionEnrollments.map((e) => e.id));

    const invalid = input.records.find((r) => !validEnrollmentIds.has(r.enrollmentId));
    if (invalid) {
      throw new BadRequestException(
        `La matrícula "${invalid.enrollmentId}" no pertenece a esa sección/año lectivo`,
      );
    }

    const records = input.records.map(
      (entry) => new AttendanceRecord(randomUUID(), entry.enrollmentId, input.date, entry.status),
    );

    await this.attendance.upsertMany(records);
    return records;
  }
}
