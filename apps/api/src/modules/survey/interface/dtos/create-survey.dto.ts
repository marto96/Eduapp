import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsISO8601, IsOptional, ValidateNested } from 'class-validator';
import { SurveyQuestionDto } from './survey-question.dto';

export class CreateSurveyDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SurveyQuestionDto)
  questions: SurveyQuestionDto[];

  @IsOptional()
  @IsISO8601()
  closesAt?: string;
}
