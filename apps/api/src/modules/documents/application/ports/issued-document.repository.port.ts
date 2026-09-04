import { DocumentType, IssuedDocument } from '../../domain/entities/issued-document.entity';
import { PaginationParams } from '../../../../core/http/pagination.dto';

export interface IssuedDocumentFilter {
  enrollmentId?: string;
  /** Restringe a estos enrollments — usado para el scoping de acceso (ver ListDocumentsUseCase), no viene del query param del cliente. */
  enrollmentIds?: string[];
  type?: DocumentType;
  /** Coincidencia parcial, sin distinguir mayúsculas, contra nombre o apellido del estudiante (requiere el join a enrollments/users). */
  search?: string;
}

export interface PaginatedIssuedDocuments {
  items: IssuedDocument[];
  total: number;
}

export abstract class IssuedDocumentRepositoryPort {
  /** `pagination` opcional — `portal-view.tsx` (el portal de familia) sigue pidiendo la lista completa sin paginar, ver ListDocumentsUseCase. */
  abstract findAll(
    filter: IssuedDocumentFilter | undefined,
    pagination?: PaginationParams,
  ): Promise<PaginatedIssuedDocuments>;
  abstract findById(id: string): Promise<IssuedDocument | null>;
  abstract save(document: IssuedDocument): Promise<void>;
}
