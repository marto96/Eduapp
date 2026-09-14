import { UpdateEmailTemplateUseCase } from './update-email-template.use-case';
import { EmailTemplateRepositoryPort } from '../ports/email-template.repository.port';
import { EmailTemplate } from '../../domain/entities/email-template.entity';

jest.mock('node:crypto', () => ({ randomUUID: jest.fn(() => 'new-id') }));

describe('UpdateEmailTemplateUseCase', () => {
  const templates: jest.Mocked<EmailTemplateRepositoryPort> = {
    findByType: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };
  const useCase = new UpdateEmailTemplateUseCase(templates);

  beforeEach(() => jest.clearAllMocks());

  it('edita la plantilla existente si ya fue personalizada', async () => {
    const existing = new EmailTemplate('t-1', 'pago_aprobado', 'Viejo', '<p>Viejo</p>', new Date().toISOString());
    templates.findByType.mockResolvedValue(existing);

    await useCase.execute('pago_aprobado', { subject: 'Nuevo', body: '<p>Nuevo</p>' });

    expect(templates.save).toHaveBeenCalledWith(expect.objectContaining({ id: 't-1', subject: 'Nuevo' }));
  });

  it('crea una plantilla nueva si el tenant nunca personalizó ese tipo', async () => {
    templates.findByType.mockResolvedValue(null);

    await useCase.execute('pago_aprobado', { subject: 'Nuevo', body: '<p>Nuevo</p>' });

    expect(templates.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'new-id', type: 'pago_aprobado' }));
  });

  it('sanitiza el body antes de guardar (ej. modo HTML crudo del frontend)', async () => {
    templates.findByType.mockResolvedValue(null);

    await useCase.execute('pago_aprobado', {
      subject: 'Nuevo',
      body: '<p>Hola</p><script>alert(1)</script>',
    });

    expect(templates.save).toHaveBeenCalledWith(expect.objectContaining({ body: '<p>Hola</p>' }));
  });
});
