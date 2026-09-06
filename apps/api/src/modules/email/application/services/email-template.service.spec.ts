import { EmailTemplateService } from './email-template.service';
import { EmailTemplateRepositoryPort } from '../ports/email-template.repository.port';
import { EmailTemplate } from '../../domain/entities/email-template.entity';

describe('EmailTemplateService', () => {
  const templates: jest.Mocked<EmailTemplateRepositoryPort> = {
    findByType: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };
  const service = new EmailTemplateService(templates);

  beforeEach(() => jest.clearAllMocks());

  it('usa la plantilla personalizada del tenant si existe', async () => {
    templates.findByType.mockResolvedValue(
      new EmailTemplate(
        't-1',
        'solicitud_recibida',
        'Asunto custom {{estudiante}}',
        '<p>Hola {{estudiante}}</p>',
        new Date().toISOString(),
      ),
    );

    const result = await service.render('solicitud_recibida', { estudiante: 'Juan' });

    expect(result.subject).toBe('Asunto custom Juan');
    expect(result.html).toBe('<p>Hola Juan</p>');
  });

  it('usa el default en código si el tenant no personalizó ese tipo', async () => {
    templates.findByType.mockResolvedValue(null);

    const result = await service.render('pago_aprobado', { trackingCode: 'ABC123' });

    expect(result.subject).toBe('Pago confirmado — solicitud ABC123');
    expect(result.html).toContain('ABC123');
  });

  it('deja el placeholder literal si falta una variable', async () => {
    templates.findByType.mockResolvedValue(null);

    const result = await service.render('pago_aprobado', {});

    expect(result.subject).toContain('{{trackingCode}}');
  });
});
