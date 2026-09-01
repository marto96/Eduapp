import { Inject, Injectable } from '@nestjs/common';
import { ScheduleFilter, ScheduleRepositoryPort } from '../ports/schedule.repository.port';
import { ClassCancellationRepositoryPort } from '../ports/class-cancellation.repository.port';
import { ClassCancellation } from '../../domain/entities/class-cancellation.entity';

export interface ListClassCancellationsInput {
  sectionId?: string;
  teacherId?: string;
  from: string;
  to: string;
}

@Injectable()
export class ListClassCancellationsUseCase {
  constructor(
    @Inject(ScheduleRepositoryPort) private readonly schedules: ScheduleRepositoryPort,
    @Inject(ClassCancellationRepositoryPort) private readonly cancellations: ClassCancellationRepositoryPort,
  ) {}

  async execute(input: ListClassCancellationsInput): Promise<ClassCancellation[]> {
    const filter: ScheduleFilter = {};
    if (input.sectionId) filter.sectionId = input.sectionId;
    if (input.teacherId) filter.teacherId = input.teacherId;

    const matchingSchedules = await this.schedules.findAll(filter);
    const scheduleIds = matchingSchedules.map((schedule) => schedule.id);

    return this.cancellations.findByScheduleIds(scheduleIds, input.from, input.to);
  }
}
