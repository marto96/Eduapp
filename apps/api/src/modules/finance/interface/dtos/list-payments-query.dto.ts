import { IsOptional, IsUUID } from 'class-validator';

export class ListPaymentsQueryDto {
  @IsOptional()
  @IsUUID()
  chargeId?: string;
}
