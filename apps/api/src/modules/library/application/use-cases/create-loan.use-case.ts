import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BookRepositoryPort } from '../ports/book.repository.port';
import { LoanRepositoryPort } from '../ports/loan.repository.port';
import { Loan } from '../../domain/entities/loan.entity';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';

export interface CreateLoanInput {
  bookId: string;
  studentId: string;
  dueDate: string;
}

@Injectable()
export class CreateLoanUseCase {
  constructor(
    @Inject(BookRepositoryPort) private readonly books: BookRepositoryPort,
    @Inject(LoanRepositoryPort) private readonly loans: LoanRepositoryPort,
    @Inject(UserRepositoryPort) private readonly users: UserRepositoryPort,
  ) {}

  async execute(input: CreateLoanInput): Promise<Loan> {
    const book = await this.books.findById(input.bookId);
    if (!book) {
      throw new NotFoundException(`No existe el libro "${input.bookId}"`);
    }

    const student = await this.users.findById(input.studentId);
    if (!student) {
      throw new NotFoundException(`No existe el usuario "${input.studentId}"`);
    }
    if (!student.hasRole('estudiante')) {
      throw new BadRequestException('Solo se puede prestar un libro a un estudiante');
    }

    const activeLoans = await this.loans.findAll({ bookId: input.bookId, active: true });
    if (activeLoans.length >= book.totalCopies) {
      throw new ConflictException('No hay copias disponibles');
    }

    const loan = new Loan(randomUUID(), input.bookId, input.studentId, new Date().toISOString(), input.dueDate);
    await this.loans.save(loan);
    return loan;
  }
}
