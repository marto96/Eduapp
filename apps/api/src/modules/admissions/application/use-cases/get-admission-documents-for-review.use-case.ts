import { Inject, Injectable } from '@nestjs/common';
import { AdmissionDocumentRepositoryPort } from '../ports/admission-document.repository.port';
import { AdmissionDocument } from '../../domain/entities/admission-document.entity';

/** Staff, por id de solicitud directo (ya lo tiene desde la lista de gestión). */
@Injectable()
export class GetAdmissionDocumentsForReviewUseCase {
  constructor(
    @Inject(AdmissionDocumentRepositoryPort) private readonly documents: AdmissionDocumentRepositoryPort,
  ) {}

  async execute(admissionApplicationId: string): Promise<AdmissionDocument[]> {
    return this.documents.findAllByApplication(admissionApplicationId);
  }
}
