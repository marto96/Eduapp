import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class RecordAdmissionInterviewDto {
  @IsDateString()
  interviewDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  interviewNotes?: string;
}
