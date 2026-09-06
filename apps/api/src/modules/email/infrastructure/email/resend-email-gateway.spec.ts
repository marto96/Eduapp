import { ConfigService } from '@nestjs/config';
import { ResendEmailGateway } from './resend-email-gateway';

const sendMock = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  })),
}));

describe('ResendEmailGateway', () => {
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'RESEND_API_KEY') return 're_test_000';
      if (key === 'RESEND_FROM_ADDRESS') return 'no-reply@eduapp.test';
      return undefined;
    }),
  } as unknown as ConfigService;

  beforeEach(() => jest.clearAllMocks());

  it('envía el correo con los datos del input y el remitente configurado', async () => {
    sendMock.mockResolvedValue({ data: { id: 'email-1' }, error: null });
    const gateway = new ResendEmailGateway(config);

    await gateway.send({ to: 'guardian@test.com', subject: 'Hola', html: '<p>Hola</p>' });

    expect(sendMock).toHaveBeenCalledWith({
      from: 'no-reply@eduapp.test',
      to: 'guardian@test.com',
      subject: 'Hola',
      html: '<p>Hola</p>',
    });
  });

  it('propaga un error si Resend responde con error', async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: 'Dominio no verificado' } });
    const gateway = new ResendEmailGateway(config);

    await expect(
      gateway.send({ to: 'guardian@test.com', subject: 'Hola', html: '<p>Hola</p>' }),
    ).rejects.toThrow('Dominio no verificado');
  });
});
