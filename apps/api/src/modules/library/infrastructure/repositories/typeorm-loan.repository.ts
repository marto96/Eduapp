import { Inject, Injectable } from '@nestjs/common';
import { DataSource, IsNull, Not, Repository } from 'typeorm';
import { LoanFilter, LoanRepositoryPort } from '../../application/ports/loan.repository.port';
import { Loan } from '../../domain/entities/loan.entity';
import { LoanOrmEntity } from '../entities/loan.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmLoanRepository extends LoanRepositoryPort {
  private readonly repo: Repository<LoanOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(LoanOrmEntity);
  }

  async findAll(filter?: LoanFilter): Promise<Loan[]> {
    const rows = await this.repo.find({
      where: {
        ...(filter?.bookId && { bookId: filter.bookId }),
        ...(filter?.studentId && { studentId: filter.studentId }),
        ...(filter?.active === true && { returnedAt: IsNull() }),
        ...(filter?.active === false && { returnedAt: Not(IsNull()) }),
      },
      order: { borrowedAt: 'DESC' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<Loan | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async save(loan: Loan): Promise<void> {
    await this.repo.save({
      id: loan.id,
      bookId: loan.bookId,
      studentId: loan.studentId,
      borrowedAt: new Date(loan.borrowedAt),
      dueDate: loan.dueDate,
      returnedAt: loan.returnedAt ? new Date(loan.returnedAt) : null,
    });
  }

  private toDomain(row: LoanOrmEntity): Loan {
    return new Loan(
      row.id,
      row.bookId,
      row.studentId,
      row.borrowedAt.toISOString(),
      row.dueDate,
      row.returnedAt ? row.returnedAt.toISOString() : null,
    );
  }
}
