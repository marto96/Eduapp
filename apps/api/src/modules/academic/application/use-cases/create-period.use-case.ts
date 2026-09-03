import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PeriodRepositoryPort } from '../ports/period.repository.port';
import { Period } from '../../domain/entities/period.entity';

export interface CreatePeriodInput {
  academicYearId: string;
  name: string;
  order: number;
  weight: number;
  startDate: string;
  endDate: string;
}

const WEIGHT_TOLERANCE = 0.001;

@Injectable()
export class CreatePeriodUseCase {
  constructor(@Inject(PeriodRepositoryPort) private readonly periods: PeriodRepositoryPort) {}

  async execute(input: CreatePeriodInput): Promise<Period> {
    const existing = await this.periods.findAll({ academicYearId: input.academicYearId });
    const totalWeight = existing.reduce((sum, p) => sum + p.weight, 0) + input.weight;
    if (totalWeight > 1 + WEIGHT_TOLERANCE) {
      throw new BadRequestException(
        `La suma de pesos de los periodos de ese año lectivo superaría el 100% (quedaría en ${Math.round(totalWeight * 100)}%)`,
      );
    }

    let period: Period;
    try {
      period = new Period(
        randomUUID(),
        input.academicYearId,
        input.name,
        input.order,
        input.weight,
        input.startDate,
        input.endDate,
      );
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    await this.periods.save(period);
    return period;
  }
}
