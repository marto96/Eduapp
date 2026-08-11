import { IsString, MinLength } from 'class-validator';

export class SubmitSurveyResponseDto {
  @IsString()
  @MinLength(1)
  selectedOption: string;
}
