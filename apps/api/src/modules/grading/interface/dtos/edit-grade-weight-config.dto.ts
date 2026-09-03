import { IsNumber, Max, Min } from 'class-validator';

export class EditGradeWeightConfigDto {
  @IsNumber()
  @Min(0.01)
  @Max(0.99)
  actividadWeight: number;

  @IsNumber()
  @Min(0.01)
  @Max(0.99)
  evaluacionBimestralWeight: number;

  @IsNumber()
  @Min(0.01)
  @Max(0.99)
  disciplinaWeight: number;
}
