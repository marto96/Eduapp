import { randomUUID } from 'node:crypto';
import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { AttendanceRecordRepositoryPort } from '../ports/attendance-record.repository.port';
import { AttendanceRecord, AttendanceStatus } from '../../domain/entities/attendance-record.entity';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

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
    private readonly enrollmentAccess: EnrollmentAccessService,
  ) {}

  async execute(input: RecordAttendanceInput, currentUser: JwtPayload): Promise<AttendanceRecord[]> {
    const canAccess = await this.enrollmentAccess.canTeacherAccessSection(currentUser, input.sectionId);
    if (!canAccess) {
      throw new ForbiddenException('No tenés un horario asignado en esa sección');
    }

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
