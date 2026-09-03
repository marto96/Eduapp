import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PeriodRepositoryPort } from '../ports/period.repository.port';
import { Period } from '../../domain/entities/period.entity';

export interface EditPeriodInput {
  name: string;
  order: number;
  weight: number;
  startDate: string;
  endDate: string;
}

const WEIGHT_TOLERANCE = 0.001;

@Injectable()
export class EditPeriodUseCase {
  constructor(@Inject(PeriodRepositoryPort) private readonly periods: PeriodRepositoryPort) {}

  async execute(id: string, input: EditPeriodInput): Promise<Period> {
    const period = await this.periods.findById(id);
    if (!period) {
      throw new NotFoundException(`No existe el periodo "${id}"`);
    }

    const siblings = await this.periods.findAll({ academicYearId: period.academicYearId });
    const totalWeight =
      siblings.filter((p) => p.id !== id).reduce((sum, p) => sum + p.weight, 0) + input.weight;
    if (totalWeight > 1 + WEIGHT_TOLERANCE) {
      throw new BadRequestException(
        `La suma de pesos de los periodos de ese año lectivo superaría el 100% (quedaría en ${Math.round(totalWeight * 100)}%)`,
      );
    }

    try {
      period.edit(input.name, input.order, input.weight, input.startDate, input.endDate);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    await this.periods.save(period);
    return period;
  }
}
