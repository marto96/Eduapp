import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  EnrollmentFilter,
  EnrollmentRepositoryPort,
} from '../../application/ports/enrollment.repository.port';
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

  async findAll(filter?: EnrollmentFilter): Promise<Enrollment[]> {
    const rows = await this.repo.find({
      where: {
        ...(filter?.studentId && { studentId: filter.studentId }),
        ...(filter?.sectionId && { sectionId: filter.sectionId }),
        ...(filter?.academicYearId && { academicYearId: filter.academicYearId }),
      },
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => this.toDomain(row));
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
