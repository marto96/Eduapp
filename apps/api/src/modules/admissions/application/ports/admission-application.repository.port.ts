import { AdmissionApplication, AdmissionStatus } from '../../domain/entities/admission-application.entity';

export interface AdmissionApplicationFilter {
  status?: AdmissionStatus;
}

export abstract class AdmissionApplicationRepositoryPort {
  abstract findById(id: string): Promise<AdmissionApplication | null>;
  abstract findByTrackingCode(trackingCode: string): Promise<AdmissionApplication | null>;
  /** Busca una solicitud en pendiente_pago o pendiente_entrevista para ese documento — evita duplicados. */
  abstract findPendingByDocumentNumber(documentNumber: string): Promise<AdmissionApplication | null>;
  abstract findAll(filter?: AdmissionApplicationFilter): Promise<AdmissionApplication[]>;
  abstract save(application: AdmissionApplication): Promise<void>;
}
