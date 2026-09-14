import { Inject, Injectable } from '@nestjs/common';
import { EmailTemplateRepositoryPort } from '../ports/email-template.repository.port';
import { TenantBrandingPort } from '../ports/tenant-branding.port';
import { EmailTemplateType } from '../../domain/entities/email-template.entity';
import { DEFAULT_EMAIL_TEMPLATES } from './default-email-templates';

@Injectable()
export class EmailTemplateService {
  constructor(
    @Inject(EmailTemplateRepositoryPort) private readonly templates: EmailTemplateRepositoryPort,
    @Inject(TenantBrandingPort) private readonly branding: TenantBrandingPort,
  ) {}

  async render(
    type: EmailTemplateType,
    variables: Record<string, string>,
  ): Promise<{ subject: string; html: string }> {
    const custom = await this.templates.findByType(type);
    const source = custom ?? DEFAULT_EMAIL_TEMPLATES[type];
    const { name, logoUrl } = await this.branding.getCurrentBranding();
    // Van después de `variables`: nadie que llame a render() puede pisarlas,
    // ni por accidente ni a propósito.
    const allVariables = { ...variables, institutionName: name, institutionLogoUrl: logoUrl ?? '' };

    return {
      subject: this.interpolate(source.subject, allVariables),
      html: this.interpolate(custom ? custom.body : source.body, allVariables),
    };
  }

  private interpolate(text: string, variables: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) =>
      Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : match,
    );
  }
}
