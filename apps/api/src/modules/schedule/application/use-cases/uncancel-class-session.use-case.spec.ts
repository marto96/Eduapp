import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UncancelClassSessionUseCase } from './uncancel-class-session.use-case';
import { ScheduleRepositoryPort } from '../ports/schedule.repository.port';
import { ClassCancellationRepositoryPort } from '../ports/class-cancellation.repository.port';
import { Schedule } from '../../domain/entities/schedule.entity';
import { ClassCancellation } from '../../domain/entities/class-cancellation.entity';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

describe('UncancelClassSessionUseCase', () => {
  const cancellations: jest.Mocked<ClassCancellationRepositoryPort> = {
    findOne: jest.fn(),
    findByScheduleIds: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    deleteById: jest.fn(),
  };
  const schedules: jest.Mocked<ScheduleRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new UncancelClassSessionUseCase(cancellations, schedules);

  function user(overrides: Partial<JwtPayload> = {}): JwtPayload {
    return { sub: 'teacher-1', email: 't@x.com', roles: ['docente'], tenantId: 't1', ...overrides };
  }

  beforeEach(() => jest.clearAllMocks());

  it('lanza NotFoundException si la cancelación no existe', async () => {
    cancellations.findById.mockResolvedValue(null);
    await expect(useCase.execute('c-1', user())).rejects.toThrow(NotFoundException);
  });

  it('lanza ForbiddenException si el actor no es el docente dueño ni un directivo/admin', async () => {
    cancellations.findById.mockResolvedValue(new ClassCancellation('c-1', 'sched-1', '2026-08-24', 'teacher-1'));
    schedules.findById.mockResolvedValue(
      new Schedule('sched-1', 'section-1', 'subject-1', 'teacher-1', 'year-1', 'lunes', '08:00', '09:00'),
    );
    await expect(useCase.execute('c-1', user({ sub: 'otro-docente', roles: ['docente'] }))).rejects.toThrow(
      ForbiddenException,
    );
    expect(cancellations.deleteById).not.toHaveBeenCalled();
  });

  it('el docente dueño puede revertir su propia cancelación', async () => {
    cancellations.findById.mockResolvedValue(new ClassCancellation('c-1', 'sched-1', '2026-08-24', 'teacher-1'));
    schedules.findById.mockResolvedValue(
      new Schedule('sched-1', 'section-1', 'subject-1', 'teacher-1', 'year-1', 'lunes', '08:00', '09:00'),
    );

    await useCase.execute('c-1', user());

    expect(cancellations.deleteById).toHaveBeenCalledWith('c-1');
  });

  it('un directivo puede revertir la cancelación de un docente que no es el suyo', async () => {
    cancellations.findById.mockResolvedValue(new ClassCancellation('c-1', 'sched-1', '2026-08-24', 'teacher-1'));
    schedules.findById.mockResolvedValue(
      new Schedule('sched-1', 'section-1', 'subject-1', 'teacher-1', 'year-1', 'lunes', '08:00', '09:00'),
    );

    await useCase.execute('c-1', user({ sub: 'director-1', roles: ['directivo'] }));

    expect(cancellations.deleteById).toHaveBeenCalledWith('c-1');
  });
});
