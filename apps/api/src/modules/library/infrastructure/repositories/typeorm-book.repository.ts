import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BookRepositoryPort } from '../../application/ports/book.repository.port';
import { Book } from '../../domain/entities/book.entity';
import { BookOrmEntity } from '../entities/book.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmBookRepository extends BookRepositoryPort {
  private readonly repo: Repository<BookOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(BookOrmEntity);
  }

  async findAll(): Promise<Book[]> {
    const rows = await this.repo.find({ order: { title: 'ASC' } });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<Book | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async save(book: Book): Promise<void> {
    await this.repo.save({
      id: book.id,
      title: book.title,
      author: book.author,
      totalCopies: book.totalCopies,
    });
  }

  private toDomain(row: BookOrmEntity): Book {
    return new Book(row.id, row.title, row.author, row.totalCopies);
  }
}
