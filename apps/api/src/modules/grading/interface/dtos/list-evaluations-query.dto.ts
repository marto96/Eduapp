import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { GradeCategory } from '../../domain/entities/grade-weight-config.entity';

const KNOWN_CATEGORIES: GradeCategory[] = ['actividad', 'evaluacion_bimestral', 'disciplina'];

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

  @IsOptional()
  @IsUUID()
  periodId?: string;

  @IsOptional()
  @IsIn(KNOWN_CATEGORIES)
  category?: GradeCategory;
}
