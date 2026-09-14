import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { EmailTemplateRepositoryPort } from '../ports/email-template.repository.port';
import { EmailTemplate, EmailTemplateType } from '../../domain/entities/email-template.entity';
import { sanitizeEmailHtml } from '../services/sanitize-email-html';

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
    // Se sanitiza acá (único punto de escritura) para que el body quede
    // siempre limpio en la base, sin importar si vino del editor visual
    // o del modo HTML crudo del frontend.
    const body = sanitizeEmailHtml(input.body);
    const existing = await this.templates.findByType(type);
    if (existing) {
      existing.edit(input.subject, body);
      await this.templates.save(existing);
      return;
    }
    await this.templates.save(
      new EmailTemplate(randomUUID(), type, input.subject, body, new Date().toISOString()),
    );
  }
}
