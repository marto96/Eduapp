import { CompleteDocumentPaymentUseCase } from './complete-document-payment.use-case';
import { DocumentRequestRepositoryPort } from '../ports/document-request.repository.port';
import { DocumentRequest } from '../../domain/entities/document-request.entity';
import { IssueDocumentUseCase } from './issue-document.use-case';
import { CreateNotificationUseCase } from '../../../notifications/application/use-cases/create-notification.use-case';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { IssuedDocument } from '../../domain/entities/issued-document.entity';
import { User } from '../../../identity/domain/entities/user.entity';

describe('CompleteDocumentPaymentUseCase', () => {
  const documentRequests: jest.Mocked<DocumentRequestRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByChargeId: jest.fn(),
    save: jest.fn(),
  };
  const issueDocument = { execute: jest.fn() } as unknown as jest.Mocked<IssueDocumentUseCase>;
  const createNotification = { execute: jest.fn() } as unknown as jest.Mocked<CreateNotificationUseCase>;
  const users: jest.Mocked<UserRepositoryPort> = {
    findByEmail: jest.fn(),
    findByDocumentNumber: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new CompleteDocumentPaymentUseCase(documentRequests, issueDocument, createNotification, users);

  function staffUser(id: string, role: string): User {
    return {
      id,
      email: `${id}@x.com`,
      roles: [role as never],
    } as unknown as User;
  }

  beforeEach(() => jest.clearAllMocks());

  it('no hace nada si el cargo no tiene una solicitud de documento asociada', async () => {
    documentRequests.findByChargeId.mockResolvedValue(null);
    await useCase.execute('charge-1');
    expect(issueDocument.execute).not.toHaveBeenCalled();
  });

  it('no hace nada si la solicitud ya no está pendiente_pago (idempotencia ante doble pago aprobado)', async () => {
    const request = new DocumentRequest(
      'req-1', 'enrollment-1', 'certificado_notas', 'digital', null, 'padre-1',
      '2026-09-11T00:00:00.000Z', 'lista', 'charge-1', 'doc-1',
    );
    documentRequests.findByChargeId.mockResolvedValue(request);

    await useCase.execute('charge-1');

    expect(issueDocument.execute).not.toHaveBeenCalled();
    expect(documentRequests.save).not.toHaveBeenCalled();
    expect(createNotification.execute).not.toHaveBeenCalled();
  });

  it('genera el documento y marca la solicitud lista (digital) sin notificar a nadie', async () => {
    const request = new DocumentRequest(
      'req-1', 'enrollment-1', 'certificado_notas', 'digital', null, 'padre-1',
      '2026-09-11T00:00:00.000Z', 'pendiente_pago', 'charge-1',
    );
    documentRequests.findByChargeId.mockResolvedValue(request);
    issueDocument.execute.mockResolvedValue(
      new IssuedDocument('doc-1', 'enrollment-1', 'certificado_notas', 'Certificado de notas', '2026-09-11', 'padre-1'),
    );

    await useCase.execute('charge-1');

    expect(documentRequests.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'lista' }));
    expect(createNotification.execute).not.toHaveBeenCalled();
  });

  it('genera el documento, marca lista_para_imprimir y notifica a admin/directivo/secretaria (físico)', async () => {
    const request = new DocumentRequest(
      'req-1', 'enrollment-1', 'certificado_notas', 'fisico', null, 'padre-1',
      '2026-09-11T00:00:00.000Z', 'pendiente_pago', 'charge-1',
    );
    documentRequests.findByChargeId.mockResolvedValue(request);
    issueDocument.execute.mockResolvedValue(
      new IssuedDocument('doc-1', 'enrollment-1', 'certificado_notas', 'Certificado de notas', '2026-09-11', 'padre-1'),
    );
    users.findAll.mockResolvedValue({
      items: [staffUser('admin-1', 'admin_institucion'), staffUser('sec-1', 'secretaria')],
      total: 2,
    });

    await useCase.execute('charge-1');

    expect(documentRequests.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'lista_para_imprimir' }));
    expect(createNotification.execute).toHaveBeenCalledTimes(2);
    expect(createNotification.execute).toHaveBeenCalledWith(
      expect.objectContaining({ recipientUserId: 'admin-1', type: 'document_request_ready_to_print' }),
    );
  });
});
