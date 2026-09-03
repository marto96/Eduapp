import { randomUUID } from 'node:crypto';
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceRecordRepositoryPort } from '../ports/attendance-record.repository.port';
import { AttendanceRecord, AttendanceStatus } from '../../domain/entities/attendance-record.entity';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { ScheduleRepositoryPort } from '../../../schedule/application/ports/schedule.repository.port';
import { ClassCancellationRepositoryPort } from '../../../schedule/application/ports/class-cancellation.repository.port';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

const MANAGER_ROLES = ['admin_institucion', 'directivo'];

export interface RecordAttendanceEntry {
  enrollmentId: string;
  status: AttendanceStatus;
}

export interface RecordAttendanceInput {
  scheduleId: string;
  date: string;
  records: RecordAttendanceEntry[];
}

@Injectable()
export class RecordAttendanceUseCase {
  constructor(
    @Inject(AttendanceRecordRepositoryPort)
    private readonly attendance: AttendanceRecordRepositoryPort,
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
    @Inject(ScheduleRepositoryPort) private readonly schedules: ScheduleRepositoryPort,
    @Inject(ClassCancellationRepositoryPort) private readonly cancellations: ClassCancellationRepositoryPort,
    private readonly enrollmentAccess: EnrollmentAccessService,
  ) {}

  async execute(input: RecordAttendanceInput, currentUser: JwtPayload): Promise<AttendanceRecord[]> {
    const schedule = await this.schedules.findById(input.scheduleId);
    if (!schedule) {
      throw new NotFoundException(`No existe el horario "${input.scheduleId}"`);
    }

    // A diferencia de `canTeacherAccessSection` (usado en Evaluations/Scores,
    // más laxo: cualquier horario en la sección alcanza), acá un docente
    // solo puede tomar asistencia de SU propio horario — es una clase suya
    // concreta, no basta con tener algún horario en la sección.
    const isOwner = schedule.teacherId === currentUser.sub;
    const isManager = currentUser.roles.some((role) => MANAGER_ROLES.includes(role));
    const isDocente = currentUser.roles.includes('docente');
    if (isDocente && !isOwner && !isManager) {
      throw new ForbiddenException('Solo el docente asignado a ese horario puede tomar asistencia');
    }

    const cancelled = await this.cancellations.findOne(input.scheduleId, input.date);
    if (cancelled) {
      throw new BadRequestException('No se puede tomar asistencia de una clase cancelada');
    }

    const sectionEnrollments = await this.enrollments.findAll({
      sectionId: schedule.sectionId,
      academicYearId: schedule.academicYearId,
    });
    const validEnrollmentIds = new Set(sectionEnrollments.map((e) => e.id));

    const invalid = input.records.find((r) => !validEnrollmentIds.has(r.enrollmentId));
    if (invalid) {
      throw new BadRequestException(
        `La matrícula "${invalid.enrollmentId}" no pertenece a esa sección/año lectivo`,
      );
    }

    const records = input.records.map(
      (entry) =>
        new AttendanceRecord(randomUUID(), entry.enrollmentId, input.scheduleId, input.date, entry.status),
    );

    await this.attendance.upsertMany(records);
    return records;
  }
}
