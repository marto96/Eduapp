import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { GradeCategory } from '../../domain/entities/grade-weight-config.entity';

const KNOWN_CATEGORIES: GradeCategory[] = ['actividad', 'evaluacion_bimestral', 'disciplina'];

export class CreateEvaluationDto {
  @IsUUID()
  subjectId: string;

  @IsUUID()
  sectionId: string;

  @IsUUID()
  academicYearId: string;

  @IsUUID()
  periodId: string;

  @IsIn(KNOWN_CATEGORIES)
  category: GradeCategory;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxScore?: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string;
}
