import { IsString, IsUUID, MinLength } from 'class-validator';

export class CreateSectionDto {
  @IsUUID()
  gradeId: string;

  @IsString()
  @MinLength(1)
  name: string;
}
