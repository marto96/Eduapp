import { Inject, Injectable } from '@nestjs/common';
import {
  IssuedDocumentFilter,
  IssuedDocumentRepositoryPort,
} from '../ports/issued-document.repository.port';
import { IssuedDocument } from '../../domain/entities/issued-document.entity';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { PaginatedResult } from '../../../../core/http/pagination.dto';
import { normalizePagination } from '../../../../core/http/pagination';

export interface ListDocumentsInput {
  enrollmentId?: string;
  type?: IssuedDocumentFilter['type'];
}

@Injectable()
export class ListDocumentsUseCase {
  constructor(
    @Inject(IssuedDocumentRepositoryPort) private readonly documents: IssuedDocumentRepositoryPort,
    private readonly enrollmentAccess: EnrollmentAccessService,
  ) {}

  /**
   * Sin `page`/`pageSize`, devuelve el array completo (comportamiento sin
   * cambios) — el portal de familia sigue pidiendo así "todos los
   * documentos que puedo ver" para filtrarlos por hijo del lado del
   * cliente. Con `page`/`pageSize`, pagina de verdad (panel de gestión).
   *
   * El scoping de acceso (qué enrollments puede ver este usuario) se
   * resuelve ANTES de pedirle nada al repositorio — si se aplicara
   * después, en memoria, el `total` y el contenido de la página (en modo
   * paginado) quedarían mal: se contaría/paginaría sobre el universo
   * completo, no sobre lo que el usuario realmente puede ver.
   */
  async execute(
    input: ListDocumentsInput | undefined,
    currentUser: JwtPayload,
    page?: number,
    pageSize?: number,
    search?: string,
  ): Promise<IssuedDocument[] | PaginatedResult<IssuedDocument>> {
    const trimmedSearch = search?.trim();
    const allowedEnrollmentIds = await this.enrollmentAccess.resolveAccessibleEnrollmentIds(currentUser);

    const hasFilter =
      input?.enrollmentId || input?.type || trimmedSearch || allowedEnrollmentIds !== null;
    const filter: IssuedDocumentFilter | undefined = hasFilter
      ? {
          enrollmentId: input?.enrollmentId,
          type: input?.type,
          search: trimmedSearch || undefined,
          enrollmentIds: allowedEnrollmentIds ? Array.from(allowedEnrollmentIds) : undefined,
        }
      : undefined;

    if (page === undefined && pageSize === undefined) {
      const { items } = await this.documents.findAll(filter);
      return items;
    }

    const { page: safePage, pageSize: safePageSize } = normalizePagination(page, pageSize);
    const { items, total } = await this.documents.findAll(filter, { page: safePage, pageSize: safePageSize });
    return { items, total, page: safePage, pageSize: safePageSize };
  }
}
