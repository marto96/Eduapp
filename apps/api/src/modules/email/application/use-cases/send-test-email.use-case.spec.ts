import { SendTestEmailUseCase } from './send-test-email.use-case';
import { EmailTemplateService } from '../services/email-template.service';
import { EmailPort } from '../ports/email.port';

describe('SendTestEmailUseCase', () => {
  const templateService = { render: jest.fn() } as unknown as jest.Mocked<EmailTemplateService>;
  const emailPort = { send: jest.fn() } as unknown as jest.Mocked<EmailPort>;
  const useCase = new SendTestEmailUseCase(templateService, emailPort);

  beforeEach(() => jest.clearAllMocks());

  it('renderiza con datos de ejemplo y envía al correo indicado', async () => {
    templateService.render.mockResolvedValue({ subject: 'Asunto', html: '<p>Cuerpo</p>' });

    await useCase.execute('pago_aprobado', 'destinatario@test.com');

    expect(templateService.render).toHaveBeenCalledWith('pago_aprobado', { trackingCode: 'SOL-ABC123' });
    expect(emailPort.send).toHaveBeenCalledWith({
      to: 'destinatario@test.com',
      subject: 'Asunto',
      html: '<p>Cuerpo</p>',
    });
  });

  it('propaga el error si el envío falla, a diferencia del envío normal (mejor esfuerzo)', async () => {
    templateService.render.mockResolvedValue({ subject: 'Asunto', html: '<p>Cuerpo</p>' });
    emailPort.send.mockRejectedValue(new Error('Resend rechazó la API key'));

    await expect(useCase.execute('pago_aprobado', 'destinatario@test.com')).rejects.toThrow(
      'Resend rechazó la API key',
    );
  });
});
