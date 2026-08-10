import { IsUUID } from 'class-validator';

export class EnrollStudentDto {
  @IsUUID()
  studentId: string;

  @IsUUID()
  sectionId: string;

  @IsUUID()
  academicYearId: string;
}
