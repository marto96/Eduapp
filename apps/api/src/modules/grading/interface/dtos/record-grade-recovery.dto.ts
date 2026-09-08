import { IsNumber, IsUUID, Max, Min } from 'class-validator';

export class RecordGradeRecoveryDto {
  @IsUUID()
  subjectId: string;

  @IsUUID()
  periodId: string;

  @IsNumber()
  @Min(0)
  @Max(5)
  score: number;
}
