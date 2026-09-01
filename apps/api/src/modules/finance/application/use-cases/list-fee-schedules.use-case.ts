import { Inject, Injectable } from '@nestjs/common';
import { FeeScheduleRepositoryPort } from '../ports/fee-schedule.repository.port';
import { FeeSchedule } from '../../domain/entities/fee-schedule.entity';

@Injectable()
export class ListFeeSchedulesUseCase {
  constructor(@Inject(FeeScheduleRepositoryPort) private readonly feeSchedules: FeeScheduleRepositoryPort) {}

  async execute(): Promise<FeeSchedule[]> {
    return this.feeSchedules.findAll();
  }
}
