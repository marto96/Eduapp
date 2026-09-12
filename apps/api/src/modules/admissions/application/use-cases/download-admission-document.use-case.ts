import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AdmissionDocumentRepositoryPort } from '../ports/admission-document.repository.port';
import { AdmissionDocumentType } from '../../domain/entities/admission-document.entity';
import { FileStoragePort } from '../../../../core/storage/file-storage.port';

export interface DownloadAdmissionDocumentOutput {
  buffer: Buffer;
  filename: string;
}

@Injectable()
export class DownloadAdmissionDocumentUseCase {
  constructor(
    @Inject(AdmissionDocumentRepositoryPort) private readonly documents: AdmissionDocumentRepositoryPort,
    @Inject(FileStoragePort) private readonly storage: FileStoragePort,
  ) {}

  async execute(
    admissionApplicationId: string,
    type: AdmissionDocumentType,
  ): Promise<DownloadAdmissionDocumentOutput> {
    const document = await this.documents.findByApplicationAndType(admissionApplicationId, type);
    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }
    const buffer = await this.storage.read('admission-documents', document.storageKey);
    return { buffer, filename: document.originalFilename };
  }
}
