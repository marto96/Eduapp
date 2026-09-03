import { Period } from '../../domain/entities/period.entity';

export interface PeriodFilter {
  academicYearId?: string;
}

export abstract class PeriodRepositoryPort {
  abstract findAll(filter?: PeriodFilter): Promise<Period[]>;
  abstract findById(id: string): Promise<Period | null>;
  abstract save(period: Period): Promise<void>;
}
