import { Inject, Injectable } from '@nestjs/common';
import {
  AttendanceFilter,
  AttendanceRecordRepositoryPort,
} from '../ports/attendance-record.repository.port';
import { AttendanceRecord } from '../../domain/entities/attendance-record.entity';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

@Injectable()
export class ListAttendanceUseCase {
  constructor(
    @Inject(AttendanceRecordRepositoryPort)
    private readonly attendance: AttendanceRecordRepositoryPort,
    private readonly enrollmentAccess: EnrollmentAccessService,
  ) {}

  async execute(filter: AttendanceFilter | undefined, currentUser: JwtPayload): Promise<AttendanceRecord[]> {
    const records = await this.attendance.findAll(filter);
    const allowedEnrollmentIds = await this.enrollmentAccess.resolveAccessibleEnrollmentIds(currentUser);
    if (allowedEnrollmentIds === null) return records;
    return records.filter((record) => allowedEnrollmentIds.has(record.enrollmentId));
  }
}
