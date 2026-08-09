import { IsString, MinLength } from 'class-validator';

export class CreateGradeDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  level: string;
}
