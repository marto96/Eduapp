import { IsUUID } from 'class-validator';

export class ReassignEnrollmentSectionDto {
  @IsUUID()
  sectionId: string;
}
