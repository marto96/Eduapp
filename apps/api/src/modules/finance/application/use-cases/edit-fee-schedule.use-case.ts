import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FeeScheduleRepositoryPort } from '../ports/fee-schedule.repository.port';
import { FeeSchedule } from '../../domain/entities/fee-schedule.entity';

export interface EditFeeScheduleInput {
  amount: number;
}

@Injectable()
export class EditFeeScheduleUseCase {
  constructor(@Inject(FeeScheduleRepositoryPort) private readonly feeSchedules: FeeScheduleRepositoryPort) {}

  async execute(id: string, input: EditFeeScheduleInput): Promise<FeeSchedule> {
    const feeSchedule = await this.feeSchedules.findById(id);
    if (!feeSchedule) {
      throw new NotFoundException(`No existe el precio "${id}"`);
    }

    try {
      feeSchedule.updateAmount(input.amount);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    await this.feeSchedules.save(feeSchedule);
    return feeSchedule;
  }
}
