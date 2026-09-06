import { Inject, Injectable, Logger } from '@nestjs/common';
import { EmailTemplateService } from '../services/email-template.service';
import { EmailPort } from '../ports/email.port';
import { EmailTemplateType } from '../../domain/entities/email-template.entity';

export interface SendTemplatedEmailInput {
  type: EmailTemplateType;
  to: string;
  variables: Record<string, string>;
}

/**
 * Mejor esfuerzo: un fallo al renderizar o enviar el correo nunca debe
 * tumbar el flujo que lo dispara (guardar una solicitud, confirmar un
 * pago, etc.) — esa acción ya se completó antes de llamar acá. Mismo
 * criterio que `NotifyNewGradeService`.
 */
@Injectable()
export class SendTemplatedEmailUseCase {
  private readonly logger = new Logger(SendTemplatedEmailUseCase.name);

  constructor(
    private readonly templates: EmailTemplateService,
    @Inject(EmailPort) private readonly emailPort: EmailPort,
  ) {}

  async execute(input: SendTemplatedEmailInput): Promise<void> {
    try {
      const { subject, html } = await this.templates.render(input.type, input.variables);
      await this.emailPort.send({ to: input.to, subject, html });
    } catch (err) {
      this.logger.warn(
        `No se pudo enviar el correo "${input.type}" a "${input.to}": ${(err as Error).message}`,
      );
    }
  }
}
