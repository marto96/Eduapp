import { EmailTemplate, EmailTemplateType } from '../../domain/entities/email-template.entity';

export abstract class EmailTemplateRepositoryPort {
  abstract findByType(type: EmailTemplateType): Promise<EmailTemplate | null>;
  abstract findAll(): Promise<EmailTemplate[]>;
  abstract save(template: EmailTemplate): Promise<void>;
}
