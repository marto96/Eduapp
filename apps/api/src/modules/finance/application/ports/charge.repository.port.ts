import { Charge, ChargeConcept } from '../../domain/entities/charge.entity';

export interface ChargeFilter {
  enrollmentId?: string;
  concept?: ChargeConcept;
}

export abstract class ChargeRepositoryPort {
  abstract findAll(filter?: ChargeFilter): Promise<Charge[]>;
  abstract findById(id: string): Promise<Charge | null>;
  abstract save(charge: Charge): Promise<void>;
}
