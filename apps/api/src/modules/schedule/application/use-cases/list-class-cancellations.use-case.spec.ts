import { ListClassCancellationsUseCase } from './list-class-cancellations.use-case';
import { ScheduleRepositoryPort } from '../ports/schedule.repository.port';
import { ClassCancellationRepositoryPort } from '../ports/class-cancellation.repository.port';
import { Schedule } from '../../domain/entities/schedule.entity';
import { ClassCancellation } from '../../domain/entities/class-cancellation.entity';

describe('ListClassCancellationsUseCase', () => {
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

  const useCase = new ListClassCancellationsUseCase(schedules, cancellations);

  beforeEach(() => jest.clearAllMocks());

  it('resuelve los horarios que matchean el filtro y busca sus cancelaciones por id', async () => {
    schedules.findAll.mockResolvedValue([
      new Schedule('sched-1', 'section-1', 'subject-1', 'teacher-1', 'year-1', 'lunes', '08:00', '09:00'),
      new Schedule('sched-2', 'section-1', 'subject-2', 'teacher-2', 'year-1', 'martes', '08:00', '09:00'),
    ]);
    cancellations.findByScheduleIds.mockResolvedValue([
      new ClassCancellation('c-1', 'sched-1', '2026-08-24', 'teacher-1'),
    ]);

    const result = await useCase.execute({ sectionId: 'section-1', from: '2026-08-24', to: '2026-08-30' });

    expect(schedules.findAll).toHaveBeenCalledWith({ sectionId: 'section-1' });
    expect(cancellations.findByScheduleIds).toHaveBeenCalledWith(['sched-1', 'sched-2'], '2026-08-24', '2026-08-30');
    expect(result).toHaveLength(1);
  });

  it('filtra por teacherId cuando se pasa en vez de sectionId', async () => {
    schedules.findAll.mockResolvedValue([]);
    cancellations.findByScheduleIds.mockResolvedValue([]);

    await useCase.execute({ teacherId: 'teacher-1', from: '2026-08-24', to: '2026-08-30' });

    expect(schedules.findAll).toHaveBeenCalledWith({ teacherId: 'teacher-1' });
  });
});
