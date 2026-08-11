import { IsUUID } from 'class-validator';

export class RequestGuardianLinkDto {
  @IsUUID()
  studentUserId: string;
}
