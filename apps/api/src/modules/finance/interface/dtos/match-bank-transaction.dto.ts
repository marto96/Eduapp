import { IsUUID } from 'class-validator';

export class MatchBankTransactionDto {
  @IsUUID()
  paymentId: string;
}
