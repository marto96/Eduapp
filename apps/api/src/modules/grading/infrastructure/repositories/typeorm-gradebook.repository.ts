import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  GradebookRepositoryPort,
  GradebookStudentRow,
  PaginatedGradebookStudents,
  SearchGradebookStudentsFilter,
} from '../../application/ports/gradebook.repository.port';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

interface StudentRow {
  enrollment_id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  document_number: string | null;
  section_id: string;
  section_name: string;
}

/**
 * Usa SQL crudo con `dataSource.query()` en vez del query builder de
 * TypeORM: hace falta proyectar columnas de `users` + `sections` además de
 * `enrollments`, y combinar `orderBy` + join + `skip`/`take` con
 * `getManyAndCount()` dispara un bug de larga data de TypeORM (issues
 * #3356/#4270/#8213/#11742 — ver el mismo criterio ya documentado en
 * `typeorm-issued-document.repository.ts`). Yendo directo a SQL crudo se
 * evita ese riesgo por completo.
 */
@Injectable()
export class TypeOrmGradebookRepository extends GradebookRepositoryPort {
  constructor(@Inject(TENANT_DATA_SOURCE) private readonly dataSource: DataSource) {
    super();
  }

  async searchStudents(filter: SearchGradebookStudentsFilter): Promise<PaginatedGradebookStudents> {
    const term = filter.search?.trim() ? `%${filter.search.trim()}%` : null;
    const offset = (filter.page - 1) * filter.pageSize;

    const rows = await this.dataSource.query<StudentRow[]>(
      `
        SELECT e.id AS enrollment_id, u.id AS student_id, u.first_name, u.last_name,
               u.document_number, s.id AS section_id, s.name AS section_name
        FROM enrollments e
        INNER JOIN users u ON u.id = e.student_id
        INNER JOIN sections s ON s.id = e.section_id
        WHERE e.academic_year_id = $1 AND e.status = 'active'
          AND ($2::text IS NULL OR u.first_name ILIKE $2 OR u.last_name ILIKE $2 OR u.document_number ILIKE $2)
        ORDER BY u.first_name, u.last_name
        LIMIT $3 OFFSET $4
      `,
      [filter.academicYearId, term, filter.pageSize, offset],
    );

    const [{ count }] = await this.dataSource.query<{ count: string }[]>(
      `
        SELECT COUNT(*) AS count
        FROM enrollments e
        INNER JOIN users u ON u.id = e.student_id
        WHERE e.academic_year_id = $1 AND e.status = 'active'
          AND ($2::text IS NULL OR u.first_name ILIKE $2 OR u.last_name ILIKE $2 OR u.document_number ILIKE $2)
      `,
      [filter.academicYearId, term],
    );

    const items: GradebookStudentRow[] = rows.map((row) => ({
      enrollmentId: row.enrollment_id,
      studentId: row.student_id,
      fullName: `${row.first_name} ${row.last_name}`.trim(),
      documentNumber: row.document_number,
      sectionId: row.section_id,
      sectionName: row.section_name,
    }));

    return { items, total: Number(count) };
  }
}
