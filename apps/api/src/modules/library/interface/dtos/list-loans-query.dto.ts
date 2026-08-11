import { IsOptional, IsUUID } from 'class-validator';

export class ListLoansQueryDto {
  @IsOptional()
  @IsUUID()
  bookId?: string;

  @IsOptional()
  @IsUUID()
  studentId?: string;
}
