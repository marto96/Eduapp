import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class ListClassCancellationsQueryDto {
  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}
