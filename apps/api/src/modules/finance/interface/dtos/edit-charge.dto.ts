import { IsDateString, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class EditChargeDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @MinLength(1)
  description: string;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;
}
