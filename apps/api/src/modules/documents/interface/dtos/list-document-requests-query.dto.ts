import { IsIn, IsOptional } from 'class-validator';
import { DocumentRequestStatus } from '../../domain/entities/document-request.entity';

const KNOWN_STATUSES: DocumentRequestStatus[] = [
  'pendiente_pago',
  'lista_para_imprimir',
  'lista',
  'entregada',
  'rechazada',
];

export class ListDocumentRequestsQueryDto {
  @IsOptional()
  @IsIn(KNOWN_STATUSES)
  status?: DocumentRequestStatus;
}
