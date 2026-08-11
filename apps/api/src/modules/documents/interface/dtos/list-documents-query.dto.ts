import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { DocumentType } from '../../domain/entities/issued-document.entity';

const KNOWN_TYPES: DocumentType[] = [
  'constancia_matricula',
  'certificado_notas',
  'constancia_buena_conducta',
  'otro',
];

export class ListDocumentsQueryDto {
  @IsOptional()
  @IsUUID()
  enrollmentId?: string;

  @IsOptional()
  @IsIn(KNOWN_TYPES)
  type?: DocumentType;
}
