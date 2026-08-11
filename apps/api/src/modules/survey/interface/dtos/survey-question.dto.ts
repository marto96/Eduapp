import { ArrayMinSize, IsArray, IsString, MinLength } from 'class-validator';

export class SurveyQuestionDto {
  @IsString()
  @MinLength(1)
  text: string;

  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  options: string[];
}
