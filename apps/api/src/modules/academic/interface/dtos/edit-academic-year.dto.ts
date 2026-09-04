import { IsDateString, Matches } from 'class-validator';

export class EditAcademicYearDto {
  @Matches(/^\d{4}$/, { message: 'El nombre del año lectivo debe ser un año numérico (ej. "2026")' })
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
