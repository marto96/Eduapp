import { IsNumber, Min } from 'class-validator';

export class EditFeeScheduleDto {
  @IsNumber()
  @Min(0.01)
  amount: number;
}
