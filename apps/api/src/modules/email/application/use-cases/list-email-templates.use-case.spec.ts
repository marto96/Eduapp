import { ListEmailTemplatesUseCase } from './list-email-templates.use-case';
import { EmailTemplateRepositoryPort } from '../ports/email-template.repository.port';
import { EmailTemplate } from '../../domain/entities/email-template.entity';

describe('ListEmailTemplatesUseCase', () => {
  const templates: jest.Mocked<EmailTemplateRepositoryPort> = {
    findByType: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };
  const useCase = new ListEmailTemplatesUseCase(templates);

  it('devuelve los 6 tipos, usando el default para los no personalizados', async () => {
    templates.findAll.mockResolvedValue([
      new EmailTemplate('t-1', 'solicitud_recibida', 'Asunto custom', '<p>Custom</p>', new Date().toISOString()),
    ]);

    const result = await useCase.execute();

    expect(result).toHaveLength(6);
    const custom = result.find((t) => t.type === 'solicitud_recibida');
    expect(custom?.subject).toBe('Asunto custom');
    expect(custom?.isCustom).toBe(true);
    const notCustom = result.find((t) => t.type === 'pago_aprobado');
    expect(notCustom?.isCustom).toBe(false);
  });
});
