import { IsIn, IsNumber, IsUUID, Min } from 'class-validator';
import { ChargeConcept } from '../../domain/entities/charge.entity';

const KNOWN_CONCEPTS: ChargeConcept[] = ['matricula', 'pension', 'otro'];

export class CreateFeeScheduleDto {
  @IsUUID()
  gradeId: string;

  @IsUUID()
  academicYearId: string;

  @IsIn(KNOWN_CONCEPTS)
  concept: ChargeConcept;

  @IsNumber()
  @Min(0.01)
  amount: number;
}
