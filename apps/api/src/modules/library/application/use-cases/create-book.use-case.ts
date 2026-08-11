import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { BookRepositoryPort } from '../ports/book.repository.port';
import { Book } from '../../domain/entities/book.entity';

export interface CreateBookInput {
  title: string;
  author: string;
  totalCopies: number;
}

@Injectable()
export class CreateBookUseCase {
  constructor(@Inject(BookRepositoryPort) private readonly books: BookRepositoryPort) {}

  async execute(input: CreateBookInput): Promise<Book> {
    const book = new Book(randomUUID(), input.title, input.author, input.totalCopies);
    await this.books.save(book);
    return book;
  }
}
