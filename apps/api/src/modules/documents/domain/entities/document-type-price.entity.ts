import { DocumentType } from './issued-document.entity';

export class DocumentTypePrice {
  constructor(
    public readonly type: DocumentType,
    public amount: number,
  ) {
    if (amount < 0) {
      throw new Error('El precio no puede ser negativo');
    }
  }

  updateAmount(amount: number): void {
    if (amount < 0) {
      throw new Error('El precio no puede ser negativo');
    }
    this.amount = amount;
  }
}
