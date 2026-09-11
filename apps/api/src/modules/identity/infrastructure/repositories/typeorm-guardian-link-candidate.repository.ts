import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  GuardianLinkCandidate,
  GuardianLinkCandidateRepositoryPort,
  SearchGuardianLinkCandidatesFilter,
} from '../../application/ports/guardian-link-candidate.repository.port';
import { DocumentType } from '../../domain/entities/user.entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

interface CandidateRow {
  id: string;
  first_name: string;
  last_name: string;
  document_type: DocumentType | null;
  document_number: string | null;
  birth_date: string | null;
  grade_name: string | null;
  section_name: string | null;
}

/**
 * SQL crudo (no query builder) por el mismo motivo que
 * `typeorm-gradebook.repository.ts`: hace falta cruzar `users` con
 * `enrollments`/`sections`/`grades` (módulos distintos, misma schema de
 * tenant). Acá además se usa `DISTINCT ON` para quedarse con la matrícula
 * más relevante por estudiante (activa primero, si no la más reciente) sin
 * atarse a un año lectivo puntual — a diferencia del gradebook, esta
 * búsqueda es para vincular un acudiente, no para operar sobre un curso, así
 * que no tiene sentido pedirle al usuario que elija un año lectivo antes de
 * buscar. Un estudiante sin ninguna matrícula todavía (recién creado) igual
 * aparece, con grado/sección en null (LEFT JOIN, no INNER JOIN).
 */
@Injectable()
export class TypeOrmGuardianLinkCandidateRepository extends GuardianLinkCandidateRepositoryPort {
  constructor(@Inject(TENANT_DATA_SOURCE) private readonly dataSource: DataSource) {
    super();
  }

  async search(filter: SearchGuardianLinkCandidatesFilter): Promise<GuardianLinkCandidate[]> {
    const term = filter.search?.trim() ? `%${filter.search.trim()}%` : null;

    const rows = await this.dataSource.query<CandidateRow[]>(
      `
        SELECT * FROM (
          SELECT DISTINCT ON (u.id)
            u.id, u.first_name, u.last_name, u.document_type, u.document_number, u.birth_date,
            g.name AS grade_name, s.name AS section_name
          FROM users u
          LEFT JOIN enrollments e ON e.student_id = u.id AND e.deleted_at IS NULL
          LEFT JOIN sections s ON s.id = e.section_id AND s.deleted_at IS NULL
          LEFT JOIN grades g ON g.id = s.grade_id
          LEFT JOIN academic_years ay ON ay.id = e.academic_year_id
          WHERE 'estudiante' = ANY(u.roles)
            AND (
              $1::text IS NULL
              OR u.first_name ILIKE $1
              OR u.last_name ILIKE $1
              OR u.document_number ILIKE $1
            )
          ORDER BY u.id, (e.status = 'active') DESC, ay.start_date DESC NULLS LAST
        ) candidate
        ORDER BY candidate.first_name, candidate.last_name
        LIMIT $2
      `,
      [term, filter.limit],
    );

    return rows.map((row) => ({
      id: row.id,
      fullName: `${row.first_name} ${row.last_name}`.trim(),
      documentType: row.document_type,
      documentNumber: row.document_number,
      birthDate: row.birth_date,
      gradeName: row.grade_name,
      sectionName: row.section_name,
    }));
  }
}
