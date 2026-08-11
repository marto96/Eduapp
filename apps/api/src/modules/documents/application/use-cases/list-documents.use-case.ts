import { Inject, Injectable } from '@nestjs/common';
import {
  IssuedDocumentFilter,
  IssuedDocumentRepositoryPort,
} from '../ports/issued-document.repository.port';
import { IssuedDocument } from '../../domain/entities/issued-document.entity';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

@Injectable()
export class ListDocumentsUseCase {
  constructor(
    @Inject(IssuedDocumentRepositoryPort) private readonly documents: IssuedDocumentRepositoryPort,
    private readonly enrollmentAccess: EnrollmentAccessService,
  ) {}

  async execute(
    filter: IssuedDocumentFilter | undefined,
    currentUser: JwtPayload,
  ): Promise<IssuedDocument[]> {
    const documents = await this.documents.findAll(filter);
    const allowedEnrollmentIds = await this.enrollmentAccess.resolveAccessibleEnrollmentIds(currentUser);
    if (allowedEnrollmentIds === null) return documents;
    return documents.filter((document) => allowedEnrollmentIds.has(document.enrollmentId));
  }
}
