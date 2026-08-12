import { IsDateString } from 'class-validator';

export class FinanceReportQueryDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}
