import { IsUUID } from 'class-validator';

export class GetSubjectPeriodDetailQueryDto {
  @IsUUID()
  subjectId: string;

  @IsUUID()
  periodId: string;
}
