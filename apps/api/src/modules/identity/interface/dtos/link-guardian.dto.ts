import { IsUUID } from 'class-validator';

export class LinkGuardianDto {
  @IsUUID()
  guardianUserId: string;

  @IsUUID()
  studentUserId: string;
}
