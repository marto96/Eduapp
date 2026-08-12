import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { ChargeConcept } from '../../domain/entities/charge.entity';
import { ChargeStatus } from '../../application/use-cases/list-charges.use-case';
import { PaginationQueryDto } from '../../../../core/http/pagination.dto';

const KNOWN_CONCEPTS: ChargeConcept[] = ['matricula', 'pension', 'otro'];
const KNOWN_STATUSES: ChargeStatus[] = ['pendiente', 'parcial', 'pagado'];

export class ListChargesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  enrollmentId?: string;

  @IsOptional()
  @IsIn(KNOWN_CONCEPTS)
  concept?: ChargeConcept;

  @IsOptional()
  @IsIn(KNOWN_STATUSES)
  status?: ChargeStatus;
}
