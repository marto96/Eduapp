import { DocumentRequest, DocumentRequestStatus } from '../../domain/entities/document-request.entity';

export interface DocumentRequestFilter {
  enrollmentIds?: string[];
  status?: DocumentRequestStatus;
}

export abstract class DocumentRequestRepositoryPort {
  abstract findAll(filter?: DocumentRequestFilter): Promise<DocumentRequest[]>;
  abstract findById(id: string): Promise<DocumentRequest | null>;
  abstract findByChargeId(chargeId: string): Promise<DocumentRequest | null>;
  abstract save(request: DocumentRequest): Promise<void>;
}
