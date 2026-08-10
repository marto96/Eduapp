import { IsOptional, IsUUID } from 'class-validator';

export class ListEvaluationsQueryDto {
  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @IsOptional()
  @IsUUID()
  academicYearId?: string;

  @IsOptional()
  @IsUUID()
  subjectId?: string;
}
