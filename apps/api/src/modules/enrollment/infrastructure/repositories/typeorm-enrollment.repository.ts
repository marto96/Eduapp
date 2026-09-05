import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import {
  EnrollmentFilter,
  EnrollmentRepositoryPort,
  PaginatedEnrollments,
} from '../../application/ports/enrollment.repository.port';
import { PaginationParams } from '../../../../core/http/pagination.dto';
import { Enrollment } from '../../domain/entities/enrollment.entity';
import { EnrollmentOrmEntity } from '../entities/enrollment.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmEnrollmentRepository extends EnrollmentRepositoryPort {
  private readonly repo: Repository<EnrollmentOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(EnrollmentOrmEntity);
  }

  /**
   * `search` matchea contra la tabla `users` vía una subquery — `Enrollment`
   * no tiene relación TypeORM formal hacia ella (vive en el módulo de
   * Identity), pero está en el mismo esquema de tenant, así que una
   * subquery directa es más simple que traer el nombre del estudiante acá.
   */
  private buildQuery(filter?: EnrollmentFilter): SelectQueryBuilder<EnrollmentOrmEntity> {
    const query = this.repo.createQueryBuilder('enrollment').orderBy('enrollment.created_at', 'DESC');
    if (filter?.studentId) {
      query.andWhere('enrollment.student_id = :studentId', { studentId: filter.studentId });
    }
    if (filter?.sectionId) {
      query.andWhere('enrollment.section_id = :sectionId', { sectionId: filter.sectionId });
    }
    if (filter?.academicYearId) {
      query.andWhere('enrollment.academic_year_id = :academicYearId', {
        academicYearId: filter.academicYearId,
      });
    }
    if (filter?.search) {
      query.andWhere(
        `enrollment.student_id IN (
          SELECT id FROM users
          WHERE first_name ILIKE :term OR last_name ILIKE :term OR email ILIKE :term
        )`,
        { term: `%${filter.search}%` },
      );
    }
    return query;
  }

  async findAll(filter?: EnrollmentFilter): Promise<Enrollment[]> {
    const rows = await this.buildQuery(filter).getMany();
    return rows.map((row) => this.toDomain(row));
  }

  async findAllPaginated(
    filter: EnrollmentFilter | undefined,
    pagination: PaginationParams,
  ): Promise<PaginatedEnrollments> {
    const [rows, total] = await this.buildQuery(filter)
      .skip((pagination.page - 1) * pagination.pageSize)
      .take(pagination.pageSize)
      .getManyAndCount();
    return { items: rows.map((row) => this.toDomain(row)), total };
  }

  async findById(id: string): Promise<Enrollment | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findActiveByStudentAndYear(
    studentId: string,
    academicYearId: string,
  ): Promise<Enrollment | null> {
    const row = await this.repo.findOne({
      where: { studentId, academicYearId, status: 'active' },
    });
    return row ? this.toDomain(row) : null;
  }

  async save(enrollment: Enrollment): Promise<void> {
    await this.repo.save({
      id: enrollment.id,
      studentId: enrollment.studentId,
      sectionId: enrollment.sectionId,
      academicYearId: enrollment.academicYearId,
      status: enrollment.status,
    });
  }

  private toDomain(row: EnrollmentOrmEntity): Enrollment {
    return new Enrollment(row.id, row.studentId, row.sectionId, row.academicYearId, row.status);
  }
}
