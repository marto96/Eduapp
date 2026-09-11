import { Inject, Injectable } from '@nestjs/common';
import { DocumentRequestRepositoryPort } from '../ports/document-request.repository.port';
import { DocumentRequest, DocumentRequestStatus } from '../../domain/entities/document-request.entity';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

@Injectable()
export class ListDocumentRequestsUseCase {
  constructor(
    @Inject(DocumentRequestRepositoryPort) private readonly documentRequests: DocumentRequestRepositoryPort,
    private readonly enrollmentAccess: EnrollmentAccessService,
  ) {}

  async execute(currentUser: JwtPayload, status?: DocumentRequestStatus): Promise<DocumentRequest[]> {
    const allowedEnrollmentIds = await this.enrollmentAccess.resolveAccessibleEnrollmentIds(currentUser);
    return this.documentRequests.findAll({
      enrollmentIds: allowedEnrollmentIds ? Array.from(allowedEnrollmentIds) : undefined,
      status,
    });
  }
}
