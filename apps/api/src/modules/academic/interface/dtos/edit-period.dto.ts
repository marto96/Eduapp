import { IsDateString, IsInt, IsNumber, IsString, Max, Min, MinLength } from 'class-validator';

export class EditPeriodDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsInt()
  @Min(1)
  order: number;

  @IsNumber()
  @Min(0.01)
  @Max(1)
  weight: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
