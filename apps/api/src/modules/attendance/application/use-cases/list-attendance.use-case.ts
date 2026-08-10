import { Inject, Injectable } from '@nestjs/common';
import {
  AttendanceFilter,
  AttendanceRecordRepositoryPort,
} from '../ports/attendance-record.repository.port';
import { AttendanceRecord } from '../../domain/entities/attendance-record.entity';

@Injectable()
export class ListAttendanceUseCase {
  constructor(
    @Inject(AttendanceRecordRepositoryPort)
    private readonly attendance: AttendanceRecordRepositoryPort,
  ) {}

  async execute(filter?: AttendanceFilter): Promise<AttendanceRecord[]> {
    return this.attendance.findAll(filter);
  }
}
