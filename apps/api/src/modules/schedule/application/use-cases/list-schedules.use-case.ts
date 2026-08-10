import { Inject, Injectable } from '@nestjs/common';
import { ScheduleFilter, ScheduleRepositoryPort } from '../ports/schedule.repository.port';
import { Schedule } from '../../domain/entities/schedule.entity';

@Injectable()
export class ListSchedulesUseCase {
  constructor(@Inject(ScheduleRepositoryPort) private readonly schedules: ScheduleRepositoryPort) {}

  async execute(filter?: ScheduleFilter): Promise<Schedule[]> {
    return this.schedules.findAll(filter);
  }
}
