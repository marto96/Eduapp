import { IsIn } from 'class-validator';
import { DocumentType } from '../../domain/entities/issued-document.entity';

const KNOWN_TYPES: DocumentType[] = [
  'constancia_matricula',
  'certificado_notas',
  'constancia_buena_conducta',
  'otro',
];

export class SetDocumentTypePriceParamDto {
  @IsIn(KNOWN_TYPES)
  type: DocumentType;
}
