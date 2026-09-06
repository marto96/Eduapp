import { Inject, Injectable } from '@nestjs/common';
import { EmailTemplateRepositoryPort } from '../ports/email-template.repository.port';
import { EmailTemplateType } from '../../domain/entities/email-template.entity';
import { DEFAULT_EMAIL_TEMPLATES } from '../services/default-email-templates';

export interface EmailTemplateSummary {
  type: EmailTemplateType;
  subject: string;
  body: string;
  isCustom: boolean;
}

@Injectable()
export class ListEmailTemplatesUseCase {
  constructor(
    @Inject(EmailTemplateRepositoryPort) private readonly templates: EmailTemplateRepositoryPort,
  ) {}

  async execute(): Promise<EmailTemplateSummary[]> {
    const saved = await this.templates.findAll();
    const savedByType = new Map(saved.map((t) => [t.type, t]));

    return (Object.keys(DEFAULT_EMAIL_TEMPLATES) as EmailTemplateType[]).map((type) => {
      const custom = savedByType.get(type);
      const fallback = DEFAULT_EMAIL_TEMPLATES[type];
      return {
        type,
        subject: custom?.subject ?? fallback.subject,
        body: custom?.body ?? fallback.body,
        isCustom: !!custom,
      };
    });
  }
}
