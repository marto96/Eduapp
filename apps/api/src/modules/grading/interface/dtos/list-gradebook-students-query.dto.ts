import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../core/http/pagination.dto';

export class ListGradebookStudentsQueryDto extends PaginationQueryDto {
  @IsUUID()
  academicYearId: string;

  @IsOptional()
  @IsString()
  search?: string;
}
