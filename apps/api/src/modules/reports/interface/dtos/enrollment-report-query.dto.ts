import { IsOptional, IsUUID } from 'class-validator';

export class EnrollmentReportQueryDto {
  @IsOptional()
  @IsUUID()
  academicYearId?: string;
}
