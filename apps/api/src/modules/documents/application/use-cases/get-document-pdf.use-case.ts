import { Inject, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { IssuedDocumentRepositoryPort } from '../ports/issued-document.repository.port';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { FileStoragePort } from '../../../../core/storage/file-storage.port';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

@Injectable()
export class GetDocumentPdfUseCase {
  constructor(
    @Inject(IssuedDocumentRepositoryPort) private readonly documents: IssuedDocumentRepositoryPort,
    private readonly enrollmentAccess: EnrollmentAccessService,
    @Inject(FileStoragePort) private readonly storage: FileStoragePort,
  ) {}

  async execute(id: string, currentUser: JwtPayload): Promise<Buffer> {
    const document = await this.documents.findById(id);
    if (!document || !document.pdfGeneratedAt) {
      throw new NotFoundException('Este documento no tiene un PDF generado');
    }

    const allowedEnrollmentIds = await this.enrollmentAccess.resolveAccessibleEnrollmentIds(currentUser);
    if (allowedEnrollmentIds !== null && !allowedEnrollmentIds.has(document.enrollmentId)) {
      throw new ForbiddenException('No tenés acceso a este documento');
    }

    return this.storage.read('documents', `${id}.pdf`);
  }
}
