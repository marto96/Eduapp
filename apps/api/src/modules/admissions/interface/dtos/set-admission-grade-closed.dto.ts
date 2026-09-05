import { IsBoolean, IsUUID } from 'class-validator';

export class SetAdmissionGradeClosedDto {
  @IsUUID()
  academicYearId: string;

  @IsBoolean()
  closed: boolean;
}
