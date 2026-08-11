import { IsString, MinLength } from 'class-validator';

export class SurveyAnswerDto {
  @IsString()
  @MinLength(1)
  questionId: string;

  @IsString()
  @MinLength(1)
  selectedOption: string;
}
