import { Inject, Injectable } from '@nestjs/common';
import { EnrollmentFilter, EnrollmentRepositoryPort } from '../ports/enrollment.repository.port';
import { Enrollment } from '../../domain/entities/enrollment.entity';
import { EnrollmentAccessService } from '../services/enrollment-access.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { PaginatedResult } from '../../../../core/http/pagination.dto';
import { normalizePagination } from '../../../../core/http/pagination';

export interface ListEnrollmentsQuery {
  studentId?: string;
  sectionId?: string;
  academicYearId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class ListEnrollmentsUseCase {
  constructor(
    @Inject(EnrollmentRepositoryPort) private readonly enrollments: EnrollmentRepositoryPort,
    private readonly enrollmentAccess: EnrollmentAccessService,
  ) {}

  /**
   * Sin `page`/`pageSize`, devuelve el array completo (comportamiento sin
   * cambios) — lo siguen usando así asistencia, calificaciones, reportes y
   * mensajería para poblar selects/listas internas. Con `page`/`pageSize`,
   * pagina de verdad (pantalla de gestión de matrículas).
   */
  async execute(
    query: ListEnrollmentsQuery | undefined,
    currentUser: JwtPayload,
  ): Promise<Enrollment[] | PaginatedResult<Enrollment>> {
    const filter: EnrollmentFilter = {
      studentId: query?.studentId,
      sectionId: query?.sectionId,
      academicYearId: query?.academicYearId,
      search: query?.search?.trim() || undefined,
    };
    const allowedEnrollmentIds = await this.enrollmentAccess.resolveAccessibleEnrollmentIds(currentUser);

    if (query?.page === undefined && query?.pageSize === undefined) {
      const rows = await this.enrollments.findAll(filter);
      if (allowedEnrollmentIds === null) return rows;
      return rows.filter((e) => allowedEnrollmentIds.has(e.id));
    }

    const { page, pageSize } = normalizePagination(query.page, query.pageSize);

    if (allowedEnrollmentIds === null) {
      const { items, total } = await this.enrollments.findAllPaginated(filter, { page, pageSize });
      return { items, total, page, pageSize };
    }

    // Rol restringido pidiendo paginación: hoy no pasa en la UI (la
    // pantalla paginada es solo para admin_institucion/directivo, que
    // siempre reciben `null` arriba), pero si algún día se expone, esto
    // mantiene el total y la página correctos filtrando en memoria antes
    // de paginar, en vez de paginar en la DB antes del filtro de acceso.
    const allRows = await this.enrollments.findAll(filter);
    const filtered = allRows.filter((e) => allowedEnrollmentIds.has(e.id));
    const start = (page - 1) * pageSize;
    return {
      items: filtered.slice(start, start + pageSize),
      total: filtered.length,
      page,
      pageSize,
    };
  }
}
