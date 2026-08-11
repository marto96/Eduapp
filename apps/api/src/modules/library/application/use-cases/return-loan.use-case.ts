import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { LoanRepositoryPort } from '../ports/loan.repository.port';
import { Loan } from '../../domain/entities/loan.entity';

@Injectable()
export class ReturnLoanUseCase {
  constructor(@Inject(LoanRepositoryPort) private readonly loans: LoanRepositoryPort) {}

  async execute(id: string): Promise<Loan> {
    const loan = await this.loans.findById(id);
    if (!loan) {
      throw new NotFoundException(`No existe el préstamo "${id}"`);
    }
    if (loan.returnedAt) {
      throw new ConflictException('El préstamo ya fue devuelto');
    }

    loan.returnBook();
    await this.loans.save(loan);
    return loan;
  }
}
