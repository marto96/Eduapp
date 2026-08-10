import { IsDateString, IsIn, IsNumber, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { ChargeConcept } from '../../domain/entities/charge.entity';

const KNOWN_CONCEPTS: ChargeConcept[] = ['matricula', 'pension', 'otro'];

export class CreateChargeDto {
  @IsUUID()
  enrollmentId: string;

  @IsIn(KNOWN_CONCEPTS)
  concept: ChargeConcept;

  @IsString()
  @MinLength(1)
  description: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsDateString()
  dueDate: string;
}
