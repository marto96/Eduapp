import { Inject, Injectable } from '@nestjs/common';
import { PeriodFilter, PeriodRepositoryPort } from '../ports/period.repository.port';
import { Period } from '../../domain/entities/period.entity';

@Injectable()
export class ListPeriodsUseCase {
  constructor(@Inject(PeriodRepositoryPort) private readonly periods: PeriodRepositoryPort) {}

  async execute(filter?: PeriodFilter): Promise<Period[]> {
    return this.periods.findAll(filter);
  }
}
