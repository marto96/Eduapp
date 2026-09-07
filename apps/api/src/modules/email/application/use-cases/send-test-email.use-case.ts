import { Inject, Injectable } from '@nestjs/common';
import { EmailTemplateService } from '../services/email-template.service';
import { EmailPort } from '../ports/email.port';
import { EmailTemplateType } from '../../domain/entities/email-template.entity';
import { SAMPLE_EMAIL_VARIABLES } from '../services/sample-email-variables';

/**
 * A diferencia de `SendTemplatedEmailUseCase` (mejor esfuerzo, nunca
 * lanza), este SÍ propaga cualquier error — el objetivo de un envío de
 * prueba es justamente detectar si algo está mal configurado (API key
 * inválida, dominio no verificado, etc.), así que tragarse el error
 * dejaría a quien prueba sin saber qué pasó.
 */
@Injectable()
export class SendTestEmailUseCase {
  constructor(
    private readonly templates: EmailTemplateService,
    @Inject(EmailPort) private readonly emailPort: EmailPort,
  ) {}

  async execute(type: EmailTemplateType, to: string): Promise<void> {
    const { subject, html } = await this.templates.render(type, SAMPLE_EMAIL_VARIABLES[type]);
    await this.emailPort.send({ to, subject, html });
  }
}
