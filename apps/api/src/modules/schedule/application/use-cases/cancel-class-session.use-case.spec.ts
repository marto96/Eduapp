import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CancelClassSessionUseCase } from './cancel-class-session.use-case';
import { ScheduleRepositoryPort } from '../ports/schedule.repository.port';
import { ClassCancellationRepositoryPort } from '../ports/class-cancellation.repository.port';
import { Schedule } from '../../domain/entities/schedule.entity';
import { ClassCancellation } from '../../domain/entities/class-cancellation.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

describe('CancelClassSessionUseCase', () => {
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

  const useCase = new CancelClassSessionUseCase(schedules, cancellations);

  function virtualSchedule(dayOfWeek: Schedule['dayOfWeek'] = 'lunes') {
    const schedule = new Schedule('sched-1', 'section-1', 'subject-1', 'teacher-1', 'year-1', dayOfWeek, '08:00', '09:00');
    schedule.setVirtual(true);
    return schedule;
  }

  function user(overrides: Partial<JwtPayload> = {}): JwtPayload {
    return { sub: 'teacher-1', email: 't@x.com', roles: ['docente'], tenantId: 't1', ...overrides };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    // 2026-08-24 es lunes — fija "hoy" para las validaciones de fecha.
    jest.useFakeTimers().setSystemTime(new Date('2026-08-24T12:00:00'));
  });

  afterEach(() => jest.useRealTimers());

  it('lanza NotFoundException si el horario no existe', async () => {
    schedules.findById.mockResolvedValue(null);
    await expect(useCase.execute({ scheduleId: 'sched-1', date: '2026-08-24' }, user())).rejects.toThrow(
      NotFoundException,
    );
  });

  it('lanza BadRequestException si el horario no es virtual', async () => {
    const schedule = new Schedule('sched-1', 'section-1', 'subject-1', 'teacher-1', 'year-1', 'lunes', '08:00', '09:00');
    schedules.findById.mockResolvedValue(schedule);
    await expect(useCase.execute({ scheduleId: 'sched-1', date: '2026-08-24' }, user())).rejects.toThrow(
      BadRequestException,
    );
  });

  it('lanza ForbiddenException si el actor no es el docente dueño ni un directivo/admin', async () => {
    schedules.findById.mockResolvedValue(virtualSchedule());
    await expect(
      useCase.execute(
        { scheduleId: 'sched-1', date: '2026-08-24' },
        user({ sub: 'otro-docente', roles: ['docente'] }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('lanza BadRequestException si la fecha no corresponde al día del horario', async () => {
    schedules.findById.mockResolvedValue(virtualSchedule('lunes'));
    // 2026-08-25 es martes
    await expect(useCase.execute({ scheduleId: 'sched-1', date: '2026-08-25' }, user())).rejects.toThrow(
      BadRequestException,
    );
  });

  it('lanza BadRequestException si la fecha ya pasó', async () => {
    schedules.findById.mockResolvedValue(virtualSchedule('lunes'));
    // 2026-08-17 es lunes, pero anterior a "hoy" (2026-08-24)
    await expect(useCase.execute({ scheduleId: 'sched-1', date: '2026-08-17' }, user())).rejects.toThrow(
      BadRequestException,
    );
  });

  it('lanza ConflictException si ya existe una cancelación para esa fecha', async () => {
    schedules.findById.mockResolvedValue(virtualSchedule('lunes'));
    cancellations.findOne.mockResolvedValue(new ClassCancellation('c-1', 'sched-1', '2026-08-24', 'teacher-1'));
    await expect(useCase.execute({ scheduleId: 'sched-1', date: '2026-08-24' }, user())).rejects.toThrow(
      ConflictException,
    );
    expect(cancellations.save).not.toHaveBeenCalled();
  });

  it('el docente dueño puede cancelar la clase de hoy con un motivo', async () => {
    schedules.findById.mockResolvedValue(virtualSchedule('lunes'));
    cancellations.findOne.mockResolvedValue(null);

    const result = await useCase.execute(
      { scheduleId: 'sched-1', date: '2026-08-24', reason: 'Feriado institucional' },
      user(),
    );

    expect(result.reason).toBe('Feriado institucional');
    expect(cancellations.save).toHaveBeenCalledTimes(1);
  });

  it('un directivo puede cancelar la clase de un docente que no es el suyo', async () => {
    schedules.findById.mockResolvedValue(virtualSchedule('lunes'));
    cancellations.findOne.mockResolvedValue(null);

    await useCase.execute({ scheduleId: 'sched-1', date: '2026-08-24' }, user({ sub: 'director-1', roles: ['directivo'] }));

    expect(cancellations.save).toHaveBeenCalledTimes(1);
  });

  it('traduce isUniqueViolation (condición de carrera) a ConflictException', async () => {
    schedules.findById.mockResolvedValue(virtualSchedule('lunes'));
    cancellations.findOne.mockResolvedValue(null);
    cancellations.save.mockRejectedValue({ code: '23505' });

    await expect(useCase.execute({ scheduleId: 'sched-1', date: '2026-08-24' }, user())).rejects.toThrow(
      ConflictException,
    );
  });
});
