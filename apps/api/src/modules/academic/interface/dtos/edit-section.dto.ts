import { IsString, MinLength } from 'class-validator';

export class EditSectionDto {
  @IsString()
  @MinLength(1)
  name: string;
}
