import { IsArray, IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class ReportCardQueryDto {
  @IsUUID()
  sectionId: string;

  @IsUUID()
  academicYearId: string;

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsUUID('4', { each: true })
  studentId?: string[];
}
