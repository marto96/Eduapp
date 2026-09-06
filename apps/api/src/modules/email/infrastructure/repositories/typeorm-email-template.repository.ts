import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { EmailTemplateRepositoryPort } from '../../application/ports/email-template.repository.port';
import { EmailTemplate, EmailTemplateType } from '../../domain/entities/email-template.entity';
import { EmailTemplateOrmEntity } from '../entities/email-template.orm-entity';
import { TENANT_DATA_SOURCE } from '../../../../core/database/tenant-datasource.provider';

@Injectable()
export class TypeOrmEmailTemplateRepository extends EmailTemplateRepositoryPort {
  private readonly repo: Repository<EmailTemplateOrmEntity>;

  constructor(@Inject(TENANT_DATA_SOURCE) dataSource: DataSource) {
    super();
    this.repo = dataSource.getRepository(EmailTemplateOrmEntity);
  }

  async findByType(type: EmailTemplateType): Promise<EmailTemplate | null> {
    const row = await this.repo.findOne({ where: { type } });
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<EmailTemplate[]> {
    const rows = await this.repo.find();
    return rows.map((row) => this.toDomain(row));
  }

  async save(template: EmailTemplate): Promise<void> {
    await this.repo.save({
      id: template.id,
      type: template.type,
      subject: template.subject,
      body: template.body,
      updatedAt: new Date(template.updatedAt),
    });
  }

  private toDomain(row: EmailTemplateOrmEntity): EmailTemplate {
    return new EmailTemplate(row.id, row.type, row.subject, row.body, row.updatedAt.toISOString());
  }
}
