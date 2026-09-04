import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../core/http/pagination.dto';
import { DocumentType } from '../../domain/entities/issued-document.entity';

const KNOWN_TYPES: DocumentType[] = [
  'constancia_matricula',
  'certificado_notas',
  'constancia_buena_conducta',
  'otro',
];

export class ListDocumentsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  enrollmentId?: string;

  @IsOptional()
  @IsIn(KNOWN_TYPES)
  type?: DocumentType;

  @IsOptional()
  @IsString()
  search?: string;
}
