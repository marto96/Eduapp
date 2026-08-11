import { Module } from '@nestjs/common';
import { BooksController } from './interface/controllers/books.controller';
import { LoansController } from './interface/controllers/loans.controller';
import { CreateBookUseCase } from './application/use-cases/create-book.use-case';
import { ListBooksUseCase } from './application/use-cases/list-books.use-case';
import { CreateLoanUseCase } from './application/use-cases/create-loan.use-case';
import { ReturnLoanUseCase } from './application/use-cases/return-loan.use-case';
import { ListLoansUseCase } from './application/use-cases/list-loans.use-case';
import { BookRepositoryPort } from './application/ports/book.repository.port';
import { TypeOrmBookRepository } from './infrastructure/repositories/typeorm-book.repository';
import { LoanRepositoryPort } from './application/ports/loan.repository.port';
import { TypeOrmLoanRepository } from './infrastructure/repositories/typeorm-loan.repository';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [IdentityModule],
  controllers: [BooksController, LoansController],
  providers: [
    CreateBookUseCase,
    ListBooksUseCase,
    CreateLoanUseCase,
    ReturnLoanUseCase,
    ListLoansUseCase,
    { provide: BookRepositoryPort, useClass: TypeOrmBookRepository },
    { provide: LoanRepositoryPort, useClass: TypeOrmLoanRepository },
  ],
})
export class LibraryModule {}
