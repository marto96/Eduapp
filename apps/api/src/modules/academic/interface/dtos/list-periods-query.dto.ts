import { IsOptional, IsUUID } from 'class-validator';

export class ListPeriodsQueryDto {
  @IsOptional()
  @IsUUID()
  academicYearId?: string;
}
