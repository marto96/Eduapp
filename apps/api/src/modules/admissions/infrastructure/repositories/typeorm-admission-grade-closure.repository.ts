import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AdmissionGradeClosureRepositoryPort } from '../../application/ports/admission-grade-closure.repository.port';
import { AdmissionGradeClosure } from '../../domain/entities/admission-grade-closure.entity';
import { AdmissionGradeClosureOrmEntity } from '../entities/admission-grade-closure.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmAdmissionGradeClosureRepository extends AdmissionGradeClosureRepositoryPort {
  private readonly repo: Repository<AdmissionGradeClosureOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(AdmissionGradeClosureOrmEntity);
  }

  async findByGradeAndYear(
    gradeId: string,
    academicYearId: string,
  ): Promise<AdmissionGradeClosure | null> {
    const row = await this.repo.findOne({ where: { gradeId, academicYearId } });
    return row ? this.toDomain(row) : null;
  }

  async findByYear(academicYearId: string): Promise<AdmissionGradeClosure[]> {
    const rows = await this.repo.find({ where: { academicYearId } });
    return rows.map((row) => this.toDomain(row));
  }

  async save(closure: AdmissionGradeClosure): Promise<void> {
    await this.repo.save({
      id: closure.id,
      gradeId: closure.gradeId,
      academicYearId: closure.academicYearId,
    });
  }

  async deleteByGradeAndYear(gradeId: string, academicYearId: string): Promise<void> {
    await this.repo.delete({ gradeId, academicYearId });
  }

  private toDomain(row: AdmissionGradeClosureOrmEntity): AdmissionGradeClosure {
    return new AdmissionGradeClosure(row.id, row.gradeId, row.academicYearId, row.createdAt.toISOString());
  }
}
