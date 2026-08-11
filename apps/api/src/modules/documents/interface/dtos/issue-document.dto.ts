import { IsDateString, IsIn, IsString, IsUUID, MinLength } from 'class-validator';
import { DocumentType } from '../../domain/entities/issued-document.entity';

const KNOWN_TYPES: DocumentType[] = [
  'constancia_matricula',
  'certificado_notas',
  'constancia_buena_conducta',
  'otro',
];

export class IssueDocumentDto {
  @IsUUID()
  enrollmentId: string;

  @IsIn(KNOWN_TYPES)
  type: DocumentType;

  @IsString()
  @MinLength(1)
  description: string;

  @IsDateString()
  issuedAt: string;
}
