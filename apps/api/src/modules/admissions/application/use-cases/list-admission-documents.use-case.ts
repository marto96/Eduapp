import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { AdmissionDocumentRepositoryPort } from '../ports/admission-document.repository.port';
import { AdmissionDocument } from '../../domain/entities/admission-document.entity';

/** Público, por tracking code — le muestra al aspirante qué ya subió. */
@Injectable()
export class ListAdmissionDocumentsUseCase {
  constructor(
    @Inject(AdmissionApplicationRepositoryPort) private readonly applications: AdmissionApplicationRepositoryPort,
    @Inject(AdmissionDocumentRepositoryPort) private readonly documents: AdmissionDocumentRepositoryPort,
  ) {}

  async execute(trackingCode: string): Promise<AdmissionDocument[]> {
    const application = await this.applications.findByTrackingCode(trackingCode);
    if (!application) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    return this.documents.findAllByApplication(application.id);
  }
}
