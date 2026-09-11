import { DocumentTypePrice } from '../../domain/entities/document-type-price.entity';
import { DocumentType } from '../../domain/entities/issued-document.entity';

export abstract class DocumentTypePriceRepositoryPort {
  abstract findAll(): Promise<DocumentTypePrice[]>;
  abstract findByType(type: DocumentType): Promise<DocumentTypePrice | null>;
  abstract save(price: DocumentTypePrice): Promise<void>;
}
