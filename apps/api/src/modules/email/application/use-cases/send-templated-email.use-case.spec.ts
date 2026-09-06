import { Logger } from '@nestjs/common';
import { SendTemplatedEmailUseCase } from './send-templated-email.use-case';
import { EmailTemplateService } from '../services/email-template.service';
import { EmailPort } from '../ports/email.port';

describe('SendTemplatedEmailUseCase', () => {
  const templateService = { render: jest.fn() } as unknown as jest.Mocked<EmailTemplateService>;
  const emailPort = { send: jest.fn() } as unknown as jest.Mocked<EmailPort>;
  const useCase = new SendTemplatedEmailUseCase(templateService, emailPort);

  beforeEach(() => jest.clearAllMocks());

  it('renderiza la plantilla y envía el correo', async () => {
    templateService.render.mockResolvedValue({ subject: 'Asunto', html: '<p>Cuerpo</p>' });

    await useCase.execute({ type: 'solicitud_recibida', to: 'guardian@test.com', variables: { estudiante: 'Juan' } });

    expect(templateService.render).toHaveBeenCalledWith('solicitud_recibida', { estudiante: 'Juan' });
    expect(emailPort.send).toHaveBeenCalledWith({
      to: 'guardian@test.com',
      subject: 'Asunto',
      html: '<p>Cuerpo</p>',
    });
  });

  it('no propaga el error si el envío falla (mejor esfuerzo)', async () => {
    templateService.render.mockResolvedValue({ subject: 'Asunto', html: '<p>Cuerpo</p>' });
    emailPort.send.mockRejectedValue(new Error('Resend caído'));
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    await expect(
      useCase.execute({ type: 'solicitud_recibida', to: 'guardian@test.com', variables: {} }),
    ).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
