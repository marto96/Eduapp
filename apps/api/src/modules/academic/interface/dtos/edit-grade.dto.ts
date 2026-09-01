import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class EditGradeDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  level: string;

  /** Secuencia entre grados (ej. Sexto=6, Séptimo=7). */
  @IsInt()
  @Min(0)
  order: number;
}
