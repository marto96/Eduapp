import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class ListAttendanceQueryDto {
  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @IsOptional()
  @IsUUID()
  academicYearId?: string;

  @IsOptional()
  @IsUUID()
  enrollmentId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
