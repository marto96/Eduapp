import { IsBoolean } from 'class-validator';

export class SetAdmissionsOpenDto {
  @IsBoolean()
  open: boolean;
}
