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
}
