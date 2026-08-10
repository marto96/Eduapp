import { Module } from '@nestjs/common';
import { AttendanceController } from './interface/controllers/attendance.controller';
import { RecordAttendanceUseCase } from './application/use-cases/record-attendance.use-case';
import { ListAttendanceUseCase } from './application/use-cases/list-attendance.use-case';
import { AttendanceRecordRepositoryPort } from './application/ports/attendance-record.repository.port';
import { TypeOrmAttendanceRecordRepository } from './infrastructure/repositories/typeorm-attendance-record.repository';
import { EnrollmentModule } from '../enrollment/enrollment.module';

@Module({
  imports: [EnrollmentModule],
  controllers: [AttendanceController],
  providers: [
    RecordAttendanceUseCase,
    ListAttendanceUseCase,
    { provide: AttendanceRecordRepositoryPort, useClass: TypeOrmAttendanceRecordRepository },
  ],
})
export class AttendanceModule {}
