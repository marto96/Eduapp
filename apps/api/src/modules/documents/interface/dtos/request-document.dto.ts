import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { DocumentType } from '../../domain/entities/issued-document.entity';
import { DeliveryMethod } from '../../domain/entities/document-request.entity';

const KNOWN_TYPES: DocumentType[] = [
  'constancia_matricula',
  'certificado_notas',
  'constancia_buena_conducta',
  'otro',
];
const KNOWN_DELIVERY_METHODS: DeliveryMethod[] = ['digital', 'fisico'];

export class RequestDocumentDto {
  @IsUUID()
  enrollmentId: string;

  @IsIn(KNOWN_TYPES)
  type: DocumentType;

  @IsIn(KNOWN_DELIVERY_METHODS)
  deliveryMethod: DeliveryMethod;

  @IsOptional()
  @IsString()
  note?: string;
}
