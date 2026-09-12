import { randomUUID } from 'node:crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { AdmissionDocumentRepositoryPort } from '../ports/admission-document.repository.port';
import { AdmissionDocument, AdmissionDocumentType } from '../../domain/entities/admission-document.entity';
import { FileStoragePort, StoredFile } from '../../../../core/storage/file-storage.port';

/**
 * El tracking code es la única credencial del aspirante (no tiene cuenta) —
 * mismo modelo de acceso que GetAdmissionApplicationStatusUseCase. Subir el
 * mismo `type` de nuevo reemplaza el archivo anterior: la storage key es
 * determinística (`${applicationId}-${type}`), así que `storage.save()`
 * pisa el archivo previo sin dejar huérfanos.
 */
@Injectable()
export class UploadAdmissionDocumentUseCase {
  constructor(
    @Inject(AdmissionApplicationRepositoryPort) private readonly applications: AdmissionApplicationRepositoryPort,
    @Inject(AdmissionDocumentRepositoryPort) private readonly documents: AdmissionDocumentRepositoryPort,
    @Inject(FileStoragePort) private readonly storage: FileStoragePort,
  ) {}

  async execute(
    trackingCode: string,
    type: AdmissionDocumentType,
    file: StoredFile,
  ): Promise<AdmissionDocument> {
    const application = await this.applications.findByTrackingCode(trackingCode);
    if (!application) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    const extension = file.originalname.includes('.') ? file.originalname.split('.').pop() : 'bin';
    const storageKey = `${application.id}-${type}.${extension}`;
    await this.storage.save('admission-documents', storageKey, file, 'private');

    const existing = await this.documents.findByApplicationAndType(application.id, type);
    if (existing) {
      existing.replace(storageKey, file.originalname);
      await this.documents.save(existing);
      return existing;
    }

    const document = new AdmissionDocument(
      randomUUID(),
      application.id,
      type,
      storageKey,
      file.originalname,
      new Date().toISOString(),
    );
    await this.documents.save(document);
    return document;
  }
}
