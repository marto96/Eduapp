import { EmailTemplateService } from './email-template.service';
import { EmailTemplateRepositoryPort } from '../ports/email-template.repository.port';
import { TenantBrandingPort } from '../ports/tenant-branding.port';
import { EmailTemplate } from '../../domain/entities/email-template.entity';

describe('EmailTemplateService', () => {
  const templates: jest.Mocked<EmailTemplateRepositoryPort> = {
    findByType: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };
  const branding: jest.Mocked<TenantBrandingPort> = {
    getCurrentBranding: jest.fn(),
  };
  const service = new EmailTemplateService(templates, branding);

  beforeEach(() => {
    jest.clearAllMocks();
    branding.getCurrentBranding.mockResolvedValue({ name: 'Colegio Demo', logoUrl: 'https://cdn.eduapp.co/logo.png' });
  });

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

  it('agrega institutionName/institutionLogoUrl del tenant actual, disponibles para interpolar', async () => {
    templates.findByType.mockResolvedValue(
      new EmailTemplate(
        't-1',
        'solicitud_recibida',
        'Bienvenido a {{institutionName}}',
        '<img src="{{institutionLogoUrl}}"><p>Hola {{estudiante}}</p>',
        new Date().toISOString(),
      ),
    );

    const result = await service.render('solicitud_recibida', { estudiante: 'Juan' });

    expect(result.subject).toBe('Bienvenido a Colegio Demo');
    expect(result.html).toBe('<img src="https://cdn.eduapp.co/logo.png"><p>Hola Juan</p>');
  });

  it('institutionName/institutionLogoUrl no pueden ser pisadas por las variables del caller', async () => {
    templates.findByType.mockResolvedValue(
      new EmailTemplate(
        't-1',
        'solicitud_recibida',
        '{{institutionName}}',
        '<p>{{institutionName}}</p>',
        new Date().toISOString(),
      ),
    );

    const result = await service.render('solicitud_recibida', { institutionName: 'Intento de pisado' });

    expect(result.subject).toBe('Colegio Demo');
  });

  it('institutionLogoUrl interpola vacío si el tenant no tiene logo cargado', async () => {
    branding.getCurrentBranding.mockResolvedValue({ name: 'Colegio Demo', logoUrl: null });
    templates.findByType.mockResolvedValue(
      new EmailTemplate(
        't-1',
        'solicitud_recibida',
        'Asunto',
        '<img src="{{institutionLogoUrl}}">',
        new Date().toISOString(),
      ),
    );

    const result = await service.render('solicitud_recibida', {});

    expect(result.html).toBe('<img src="">');
  });
});
