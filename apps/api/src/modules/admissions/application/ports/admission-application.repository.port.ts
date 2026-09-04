import { AdmissionApplication, AdmissionStatus } from '../../domain/entities/admission-application.entity';

export interface AdmissionApplicationFilter {
  status?: AdmissionStatus;
  /** Coincidencia parcial, sin distinguir mayúsculas, contra código de seguimiento o nombre/apellido del aspirante. */
  search?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedAdmissionApplications {
  items: AdmissionApplication[];
  total: number;
}

export abstract class AdmissionApplicationRepositoryPort {
  abstract findById(id: string): Promise<AdmissionApplication | null>;
  abstract findByTrackingCode(trackingCode: string): Promise<AdmissionApplication | null>;
  /** Busca una solicitud en pendiente_pago o pendiente_entrevista para ese documento — evita duplicados. */
  abstract findPendingByDocumentNumber(documentNumber: string): Promise<AdmissionApplication | null>;
  abstract findAll(
    filter: AdmissionApplicationFilter | undefined,
    pagination: PaginationParams,
  ): Promise<PaginatedAdmissionApplications>;
  abstract save(application: AdmissionApplication): Promise<void>;
}
