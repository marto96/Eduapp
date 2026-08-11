import { Inject, Injectable } from '@nestjs/common';
import { BookRepositoryPort } from '../ports/book.repository.port';
import { Book } from '../../domain/entities/book.entity';

@Injectable()
export class ListBooksUseCase {
  constructor(@Inject(BookRepositoryPort) private readonly books: BookRepositoryPort) {}

  async execute(): Promise<Book[]> {
    return this.books.findAll();
  }
}
