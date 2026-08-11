import { DocumentType, IssuedDocument } from '../../domain/entities/issued-document.entity';

export interface IssuedDocumentFilter {
  enrollmentId?: string;
  type?: DocumentType;
}

export abstract class IssuedDocumentRepositoryPort {
  abstract findAll(filter?: IssuedDocumentFilter): Promise<IssuedDocument[]>;
  abstract save(document: IssuedDocument): Promise<void>;
}
