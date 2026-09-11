import { DocumentType } from './issued-document.entity';

export type DocumentRequestStatus =
  | 'pendiente_pago'
  | 'lista_para_imprimir'
  | 'lista'
  | 'entregada'
  | 'rechazada';

export type DeliveryMethod = 'digital' | 'fisico';

export class DocumentRequest {
  constructor(
    public readonly id: string,
    public readonly enrollmentId: string,
    public readonly type: DocumentType,
    public readonly deliveryMethod: DeliveryMethod,
    public readonly note: string | null,
    public readonly requestedBy: string,
    public readonly requestedAt: string,
    public status: DocumentRequestStatus,
    public chargeId: string | null = null,
    public issuedDocumentId: string | null = null,
    public resolvedBy: string | null = null,
    public resolvedAt: string | null = null,
    public rejectionReason: string | null = null,
  ) {}

  markReady(issuedDocumentId: string): void {
    this.issuedDocumentId = issuedDocumentId;
    this.status = this.deliveryMethod === 'digital' ? 'lista' : 'lista_para_imprimir';
  }

  markDelivered(staffUserId: string): void {
    if (this.status !== 'lista_para_imprimir') {
      throw new Error('Solo se puede entregar una solicitud que está lista para imprimir');
    }
    this.status = 'entregada';
    this.resolvedBy = staffUserId;
    this.resolvedAt = new Date().toISOString();
  }

  reject(staffUserId: string, reason: string): void {
    if (this.status !== 'pendiente_pago') {
      throw new Error('Solo se puede rechazar una solicitud que todavía no fue pagada');
    }
    this.status = 'rechazada';
    this.resolvedBy = staffUserId;
    this.resolvedAt = new Date().toISOString();
    this.rejectionReason = reason;
  }
}
