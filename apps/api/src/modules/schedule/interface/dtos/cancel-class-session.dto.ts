import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelClassSessionDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
