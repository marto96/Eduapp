import { IsISO8601, IsOptional } from 'class-validator';

export class RescheduleSurveyDto {
  @IsOptional()
  @IsISO8601()
  closesAt?: string;
}
