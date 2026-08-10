import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';
import { EvaluationType } from '../../domain/entities/evaluation.entity';

const KNOWN_TYPES: EvaluationType[] = ['examen', 'tarea', 'proyecto', 'otro'];

export class CreateEvaluationDto {
  @IsUUID()
  subjectId: string;

  @IsUUID()
  sectionId: string;

  @IsUUID()
  academicYearId: string;

  @IsString()
  @MinLength(1)
  period: string;

  @IsIn(KNOWN_TYPES)
  type: EvaluationType;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxScore?: number;
}
