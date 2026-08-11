import { Body, Controller, Get, Post } from '@nestjs/common';
import { CheckPolicies } from '../../../../core/auth/casl/policies.decorator';
import { CreateBookUseCase } from '../../application/use-cases/create-book.use-case';
import { ListBooksUseCase } from '../../application/use-cases/list-books.use-case';
import { CreateBookDto } from '../dtos/create-book.dto';

@Controller('library/books')
export class BooksController {
  constructor(
    private readonly createBook: CreateBookUseCase,
    private readonly listBooks: ListBooksUseCase,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can('create', 'Book'))
  async create(@Body() dto: CreateBookDto) {
    return this.createBook.execute(dto);
  }

  @Get()
  async list() {
    return this.listBooks.execute();
  }
}
