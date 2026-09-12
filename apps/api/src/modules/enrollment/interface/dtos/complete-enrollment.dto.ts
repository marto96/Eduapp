import { IsBoolean } from 'class-validator';

export class CompleteEnrollmentDto {
  @IsBoolean()
  passed: boolean;
}
