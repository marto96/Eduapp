import { IsOptional, IsUUID } from 'class-validator';

export class ListScoresQueryDto {
  @IsOptional()
  @IsUUID()
  evaluationId?: string;

  @IsOptional()
  @IsUUID()
  enrollmentId?: string;
}
