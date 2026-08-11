import { Loan } from '../../domain/entities/loan.entity';

export interface LoanFilter {
  bookId?: string;
  studentId?: string;
  /** `true` = solo préstamos sin devolver (`returnedAt IS NULL`). */
  active?: boolean;
}

export abstract class LoanRepositoryPort {
  abstract findAll(filter?: LoanFilter): Promise<Loan[]>;
  abstract findById(id: string): Promise<Loan | null>;
  abstract save(loan: Loan): Promise<void>;
}
