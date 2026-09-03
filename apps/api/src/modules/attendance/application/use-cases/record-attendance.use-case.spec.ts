import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RecordAttendanceUseCase } from './record-attendance.use-case';
import { AttendanceRecordRepositoryPort } from '../ports/attendance-record.repository.port';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { ScheduleRepositoryPort } from '../../../schedule/application/ports/schedule.repository.port';
import { ClassCancellationRepositoryPort } from '../../../schedule/application/ports/class-cancellation.repository.port';
import { Schedule } from '../../../schedule/domain/entities/schedule.entity';
import { Enrollment } from '../../../enrollment/domain/entities/enrollment.entity';
import { ClassCancellation } from '../../../schedule/domain/entities/class-cancellation.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

describe('RecordAttendanceUseCase', () => {
  const attendance: jest.Mocked<AttendanceRecordRepositoryPort> = {
    findAll: jest.fn(),
    upsertMany: jest.fn(),
  };
  const enrollments: jest.Mocked<EnrollmentRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findActiveByStudentAndYear: jest.fn(),
    save: jest.fn(),
  };
  const schedules: jest.Mocked<ScheduleRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };
  const cancellations: jest.Mocked<ClassCancellationRepositoryPort> = {
    findOne: jest.fn(),
    findByScheduleIds: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    deleteById: jest.fn(),
  };
  const enrollmentAccess = { canTeacherAccessSection: jest.fn() } as unknown as EnrollmentAccessService;

  const useCase = new RecordAttendanceUseCase(attendance, enrollments, schedules, cancellations, enrollmentAccess);

  const schedule = new Schedule('sched-1', 'section-1', 'subject-1', 'teacher-1', 'year-1', 'lunes', '08:00', '09:00');
  const docente: JwtPayload = { sub: 'teacher-1', roles: ['docente'], tenantId: 't1' } as JwtPayload;
  const otroDocente: JwtPayload = { sub: 'teacher-2', roles: ['docente'], tenantId: 't1' } as JwtPayload;

  beforeEach(() => {
    jest.clearAllMocks();
    schedules.findById.mockResolvedValue(schedule);
    cancellations.findOne.mockResolvedValue(null);
    enrollments.findAll.mockResolvedValue([
      new Enrollment('enr-1', 'student-1', 'section-1', 'year-1', 'active'),
    ]);
  });

  it('rechaza si el horario no existe', async () => {
    schedules.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ scheduleId: 'sched-x', date: '2026-03-02', records: [] }, docente),
    ).rejects.toThrow(NotFoundException);
  });

  it('rechaza si un docente no es el titular del horario', async () => {
    await expect(
      useCase.execute(
        { scheduleId: 'sched-1', date: '2026-03-02', records: [{ enrollmentId: 'enr-1', status: 'presente' }] },
        otroDocente,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rechaza si la clase de esa fecha está cancelada', async () => {
    cancellations.findOne.mockResolvedValue(
      new ClassCancellation('cancel-1', 'sched-1', '2026-03-02', 'teacher-1', null),
    );

    await expect(
      useCase.execute(
        { scheduleId: 'sched-1', date: '2026-03-02', records: [{ enrollmentId: 'enr-1', status: 'presente' }] },
        docente,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('guarda la asistencia ligada al horario cuando todo es válido', async () => {
    const result = await useCase.execute(
      { scheduleId: 'sched-1', date: '2026-03-02', records: [{ enrollmentId: 'enr-1', status: 'ausente' }] },
      docente,
    );

    expect(result).toHaveLength(1);
    expect(result[0].scheduleId).toBe('sched-1');
    expect(result[0].status).toBe('ausente');
    expect(attendance.upsertMany).toHaveBeenCalledTimes(1);
  });

  it('admin_institucion puede tomar asistencia de cualquier horario', async () => {
    const admin: JwtPayload = { sub: 'admin-1', roles: ['admin_institucion'], tenantId: 't1' } as JwtPayload;

    const result = await useCase.execute(
      { scheduleId: 'sched-1', date: '2026-03-02', records: [{ enrollmentId: 'enr-1', status: 'presente' }] },
      admin,
    );

    expect(result).toHaveLength(1);
  });
});
