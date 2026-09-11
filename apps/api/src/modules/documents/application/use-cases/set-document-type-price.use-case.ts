import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { DocumentTypePriceRepositoryPort } from '../ports/document-type-price.repository.port';
import { DocumentTypePrice } from '../../domain/entities/document-type-price.entity';
import { DocumentType } from '../../domain/entities/issued-document.entity';

@Injectable()
export class SetDocumentTypePriceUseCase {
  constructor(
    @Inject(DocumentTypePriceRepositoryPort) private readonly prices: DocumentTypePriceRepositoryPort,
  ) {}

  async execute(type: DocumentType, amount: number): Promise<DocumentTypePrice> {
    const existing = await this.prices.findByType(type);
    let price: DocumentTypePrice;
    try {
      if (existing) {
        existing.updateAmount(amount);
        price = existing;
      } else {
        price = new DocumentTypePrice(type, amount);
      }
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
    await this.prices.save(price);
    return price;
  }
}
