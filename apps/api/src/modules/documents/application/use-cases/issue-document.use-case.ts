import { randomUUID } from 'node:crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IssuedDocumentRepositoryPort } from '../ports/issued-document.repository.port';
import { DocumentType, IssuedDocument } from '../../domain/entities/issued-document.entity';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';

export interface IssueDocumentInput {
  enrollmentId: string;
  type: DocumentType;
  description: string;
  issuedAt: string;
  issuedBy: string;
}

@Injectable()
export class IssueDocumentUseCase {
  constructor(
    @Inject(IssuedDocumentRepositoryPort) private readonly documents: IssuedDocumentRepositoryPort,
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
  ) {}

  async execute(input: IssueDocumentInput): Promise<IssuedDocument> {
    const enrollment = await this.enrollments.findById(input.enrollmentId);
    if (!enrollment) {
      throw new NotFoundException(`No existe la matrícula "${input.enrollmentId}"`);
    }

    const document = new IssuedDocument(
      randomUUID(),
      input.enrollmentId,
      input.type,
      input.description,
      input.issuedAt,
      input.issuedBy,
    );

    await this.documents.save(document);
    return document;
  }
}
