import { Inject, Injectable } from '@nestjs/common';
import {
  IssuedDocumentFilter,
  IssuedDocumentRepositoryPort,
} from '../ports/issued-document.repository.port';
import { IssuedDocument } from '../../domain/entities/issued-document.entity';

@Injectable()
export class ListDocumentsUseCase {
  constructor(
    @Inject(IssuedDocumentRepositoryPort) private readonly documents: IssuedDocumentRepositoryPort,
  ) {}

  async execute(filter?: IssuedDocumentFilter): Promise<IssuedDocument[]> {
    return this.documents.findAll(filter);
  }
}
