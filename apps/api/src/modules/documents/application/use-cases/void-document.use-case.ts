import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IssuedDocumentRepositoryPort } from '../ports/issued-document.repository.port';
import { IssuedDocument } from '../../domain/entities/issued-document.entity';

@Injectable()
export class VoidDocumentUseCase {
  constructor(
    @Inject(IssuedDocumentRepositoryPort) private readonly documents: IssuedDocumentRepositoryPort,
  ) {}

  async execute(id: string): Promise<IssuedDocument> {
    const document = await this.documents.findById(id);
    if (!document) {
      throw new NotFoundException(`No existe el documento "${id}"`);
    }
    if (document.voidedAt) {
      throw new ConflictException('El documento ya está anulado');
    }

    document.markVoided();
    await this.documents.save(document);
    return document;
  }
}
