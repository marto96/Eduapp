import { IsUUID } from 'class-validator';

export class LinkAdmissionEnrollmentDto {
  @IsUUID()
  enrollmentId: string;
}
