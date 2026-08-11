import { Book } from '../../domain/entities/book.entity';

export abstract class BookRepositoryPort {
  abstract findAll(): Promise<Book[]>;
  abstract findById(id: string): Promise<Book | null>;
  abstract save(book: Book): Promise<void>;
}
