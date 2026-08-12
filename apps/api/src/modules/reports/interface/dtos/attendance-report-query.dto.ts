import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class AttendanceReportQueryDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;

  @IsUUID()
  sectionId: string;

  @IsOptional()
  @IsUUID()
  academicYearId?: string;
}
