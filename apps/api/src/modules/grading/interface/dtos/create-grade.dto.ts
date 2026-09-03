import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { GradeCategory } from '../../domain/entities/grade-weight-config.entity';

const KNOWN_CATEGORIES: GradeCategory[] = ['actividad', 'evaluacion_bimestral', 'disciplina'];

export class CreateGradeDto {
  @IsUUID()
  subjectId: string;

  @IsUUID()
  sectionId: string;

  @IsUUID()
  periodId: string;

  @IsIn(KNOWN_CATEGORIES)
  category: GradeCategory;

  @IsOptional()
  @IsUUID()
  evaluationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxScore?: number;

  @IsNumber()
  @Min(0)
  score: number;
}
