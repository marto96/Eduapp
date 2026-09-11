import { Inject, Injectable } from '@nestjs/common';
import { DocumentTypePriceRepositoryPort } from '../ports/document-type-price.repository.port';
import { DocumentTypePrice } from '../../domain/entities/document-type-price.entity';
import { DocumentType } from '../../domain/entities/issued-document.entity';

const ALL_TYPES: DocumentType[] = [
  'constancia_matricula',
  'certificado_notas',
  'constancia_buena_conducta',
  'otro',
];

@Injectable()
export class ListDocumentTypePricesUseCase {
  constructor(
    @Inject(DocumentTypePriceRepositoryPort) private readonly prices: DocumentTypePriceRepositoryPort,
  ) {}

  async execute(): Promise<DocumentTypePrice[]> {
    const existing = await this.prices.findAll();
    const byType = new Map(existing.map((p) => [p.type, p]));
    return ALL_TYPES.map((type) => byType.get(type) ?? new DocumentTypePrice(type, 0));
  }
}
