import { AdmissionDocument, AdmissionDocumentType } from '../../domain/entities/admission-document.entity';

export abstract class AdmissionDocumentRepositoryPort {
  abstract findAllByApplication(admissionApplicationId: string): Promise<AdmissionDocument[]>;
  abstract findByApplicationAndType(
    admissionApplicationId: string,
    type: AdmissionDocumentType,
  ): Promise<AdmissionDocument | null>;
  abstract save(document: AdmissionDocument): Promise<void>;
}
