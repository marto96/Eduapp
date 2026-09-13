import { ConflictException } from '@nestjs/common';
import { CreateScheduleUseCase } from './create-schedule.use-case';
import { ScheduleRepositoryPort } from '../ports/schedule.repository.port';
import { Schedule } from '../../domain/entities/schedule.entity';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { User } from '../../../identity/domain/entities/user.entity';

describe('CreateScheduleUseCase', () => {
  const schedules: jest.Mocked<ScheduleRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };

  const users: jest.Mocked<UserRepositoryPort> = {
    findByEmail: jest.fn(),
    findByDocumentNumber: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new CreateScheduleUseCase(schedules, users);

  const teacher = () => new User('teacher-1', 't@x.com', 'hash', 'Ana', 'Pérez', ['docente'], 'active');

  const baseInput = {
    sectionId: 'section-1',
    subjectId: 'subject-1',
    teacherId: 'teacher-1',
    academicYearId: 'year-1',
    dayOfWeek: 'lunes' as const,
    startTime: '08:00',
    endTime: '09:00',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    users.findById.mockResolvedValue(teacher());
    schedules.findAll.mockResolvedValue([]);
  });

  it('crea el horario cuando no hay classroomId', async () => {
    const result = await useCase.execute(baseInput);
    expect(result.classroomId).toBeNull();
    expect(schedules.save).toHaveBeenCalled();
  });

  it('lanza ConflictException si el aula ya tiene otro horario solapado el mismo día/año', async () => {
    const existing = new Schedule(
      'sched-existing',
      'other-section',
      'other-subject',
      'other-teacher',
      'year-1',
      'lunes',
      '08:30',
      '09:30',
      false,
      'classroom-1',
    );
    schedules.findAll.mockImplementation(async (filter) => {
      if (filter?.classroomId === 'classroom-1' && filter?.academicYearId === existing.academicYearId) {
        return [existing];
      }
      return [];
    });

    await expect(useCase.execute({ ...baseInput, classroomId: 'classroom-1' })).rejects.toThrow(
      'El aula ya tiene otro horario asignado en ese rango',
    );
    expect(schedules.save).not.toHaveBeenCalled();
    expect(schedules.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ classroomId: 'classroom-1', academicYearId: 'year-1', dayOfWeek: 'lunes' }),
    );
  });

  it('no lanza si el aula tiene un horario solapado pero en otro año académico', async () => {
    const existing = new Schedule(
      'sched-existing',
      'other-section',
      'other-subject',
      'other-teacher',
      'year-2',
      'lunes',
      '08:30',
      '09:30',
      false,
      'classroom-1',
    );
    schedules.findAll.mockImplementation(async (filter) => {
      if (filter?.classroomId === 'classroom-1' && filter?.academicYearId === existing.academicYearId) {
        return [existing];
      }
      return [];
    });

    const result = await useCase.execute({ ...baseInput, classroomId: 'classroom-1' });
    expect(result.classroomId).toBe('classroom-1');
    expect(schedules.save).toHaveBeenCalled();
  });

  it('no lanza si el aula tiene horarios en otro rango sin solape', async () => {
    const existing = new Schedule(
      'sched-existing',
      'other-section',
      'other-subject',
      'other-teacher',
      'year-1',
      'lunes',
      '10:00',
      '11:00',
      false,
      'classroom-1',
    );
    schedules.findAll.mockImplementation(async (filter) => {
      if (filter?.classroomId === 'classroom-1') return [existing];
      return [];
    });

    const result = await useCase.execute({ ...baseInput, classroomId: 'classroom-1' });
    expect(result.classroomId).toBe('classroom-1');
    expect(schedules.save).toHaveBeenCalled();
  });
});
