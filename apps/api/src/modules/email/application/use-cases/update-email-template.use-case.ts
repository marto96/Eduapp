import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { EmailTemplateRepositoryPort } from '../ports/email-template.repository.port';
import { EmailTemplate, EmailTemplateType } from '../../domain/entities/email-template.entity';

export interface UpdateEmailTemplateInput {
  subject: string;
  body: string;
}

@Injectable()
export class UpdateEmailTemplateUseCase {
  constructor(
    @Inject(EmailTemplateRepositoryPort) private readonly templates: EmailTemplateRepositoryPort,
  ) {}

  async execute(type: EmailTemplateType, input: UpdateEmailTemplateInput): Promise<void> {
    const existing = await this.templates.findByType(type);
    if (existing) {
      existing.edit(input.subject, input.body);
      await this.templates.save(existing);
      return;
    }
    await this.templates.save(
      new EmailTemplate(randomUUID(), type, input.subject, input.body, new Date().toISOString()),
    );
  }
}
