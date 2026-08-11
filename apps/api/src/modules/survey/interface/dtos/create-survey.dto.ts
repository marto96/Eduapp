import { ArrayMinSize, IsArray, IsString, MinLength } from 'class-validator';

export class CreateSurveyDto {
  @IsString()
  @MinLength(1)
  question: string;

  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  options: string[];
}
