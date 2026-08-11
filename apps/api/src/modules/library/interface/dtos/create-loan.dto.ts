import { IsDateString, IsUUID } from 'class-validator';

export class CreateLoanDto {
  @IsUUID()
  bookId: string;

  @IsUUID()
  studentId: string;

  @IsDateString()
  dueDate: string;
}
