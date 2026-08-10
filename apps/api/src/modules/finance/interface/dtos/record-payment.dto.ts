import { IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaymentMethod } from '../../domain/entities/payment.entity';

const KNOWN_METHODS: PaymentMethod[] = ['efectivo', 'transferencia', 'tarjeta', 'otro'];

export class RecordPaymentDto {
  @IsUUID()
  chargeId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsIn(KNOWN_METHODS)
  method: PaymentMethod;

  @IsDateString()
  paidAt: string;

  @IsOptional()
  @IsString()
  reference?: string;
}
