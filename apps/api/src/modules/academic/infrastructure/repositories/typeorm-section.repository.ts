import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SectionRepositoryPort } from '../../application/ports/section.repository.port';
import { Section } from '../../domain/entities/section.entity';
import { SectionOrmEntity } from '../entities/section.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmSectionRepository extends SectionRepositoryPort {
  private readonly repo: Repository<SectionOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(SectionOrmEntity);
  }

  async findAll(): Promise<Section[]> {
    const rows = await this.repo.find({ order: { name: 'ASC' } });
    return rows.map((row) => new Section(row.id, row.gradeId, row.name));
  }

  async findById(id: string): Promise<Section | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? new Section(row.id, row.gradeId, row.name) : null;
  }

  async save(section: Section): Promise<void> {
    await this.repo.save({ id: section.id, gradeId: section.gradeId, name: section.name });
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.softDelete({ id });
  }

  async hasEnrollments(sectionId: string): Promise<boolean> {
    // Solo matrículas `active` bloquean el borrado — una sección con
    // matrículas `withdrawn`/`completed` ya no tiene estudiantes cursando
    // ahí, así que no hay razón para impedir eliminarla.
    const rows = await this.repo.manager.query(
      "SELECT 1 FROM enrollments WHERE section_id = $1 AND status = 'active' AND deleted_at IS NULL LIMIT 1",
      [sectionId],
    );
    return rows.length > 0;
  }
}
