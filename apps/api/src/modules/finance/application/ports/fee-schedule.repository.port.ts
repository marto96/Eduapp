import { FeeSchedule } from '../../domain/entities/fee-schedule.entity';
import { ChargeConcept } from '../../domain/entities/charge.entity';

export abstract class FeeScheduleRepositoryPort {
  abstract findAll(): Promise<FeeSchedule[]>;
  abstract findById(id: string): Promise<FeeSchedule | null>;
  abstract findOne(
    gradeId: string,
    academicYearId: string,
    concept: ChargeConcept,
  ): Promise<FeeSchedule | null>;
  abstract save(feeSchedule: FeeSchedule): Promise<void>;
}
