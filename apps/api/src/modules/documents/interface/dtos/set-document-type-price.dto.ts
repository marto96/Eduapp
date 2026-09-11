import { IsNumber, Min } from 'class-validator';

export class SetDocumentTypePriceDto {
  @IsNumber()
  @Min(0)
  amount: number;
}
