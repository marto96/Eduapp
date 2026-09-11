import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RequestDocumentUseCase } from './request-document.use-case';
import { DocumentRequestRepositoryPort } from '../ports/document-request.repository.port';
import { DocumentTypePriceRepositoryPort } from '../ports/document-type-price.repository.port';
import { DocumentTypePrice } from '../../domain/entities/document-type-price.entity';
import { IssueDocumentUseCase } from './issue-document.use-case';
import { CreateChargeUseCase } from '../../../finance/application/use-cases/create-charge.use-case';
import { EnrollmentAccessService } from '../../../enrollment/application/services/enrollment-access.service';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { IssuedDocument } from '../../domain/entities/issued-document.entity';
import { Charge } from '../../../finance/domain/entities/charge.entity';

describe('RequestDocumentUseCase', () => {
  const documentRequests: jest.Mocked<DocumentRequestRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByChargeId: jest.fn(),
    save: jest.fn(),
  };
  const prices: jest.Mocked<DocumentTypePriceRepositoryPort> = {
    findAll: jest.fn(),
    findByType: jest.fn(),
    save: jest.fn(),
  };
  const issueDocument = { execute: jest.fn() } as unknown as jest.Mocked<IssueDocumentUseCase>;
  const createCharge = { execute: jest.fn() } as unknown as jest.Mocked<CreateChargeUseCase>;
  const enrollmentAccess = {
    resolveAccessibleEnrollmentIds: jest.fn(),
  } as unknown as jest.Mocked<EnrollmentAccessService>;

  const useCase = new RequestDocumentUseCase(
    documentRequests,
    prices,
    issueDocument,
    createCharge,
    enrollmentAccess,
  );

  function user(sub: string): JwtPayload {
    return { sub, email: 'u@x.com', roles: ['padre_tutor'], tenantId: 't1' };
  }

  beforeEach(() => jest.clearAllMocks());

  it('lanza ForbiddenException si el enrollment no es accesible para el usuario', async () => {
    enrollmentAccess.resolveAccessibleEnrollmentIds.mockResolvedValue(new Set(['otro-enrollment']));
    await expect(
      useCase.execute({ enrollmentId: 'enrollment-1', type: 'certificado_notas', deliveryMethod: 'digital' }, user('padre-1')),
    ).rejects.toThrow(ForbiddenException);
  });

  it('si el tipo es gratis, genera el documento en el momento y queda "lista" (digital)', async () => {
    enrollmentAccess.resolveAccessibleEnrollmentIds.mockResolvedValue(new Set(['enrollment-1']));
    prices.findByType.mockResolvedValue(null); // sin fila = gratis
    issueDocument.execute.mockResolvedValue(
      new IssuedDocument('doc-1', 'enrollment-1', 'certificado_notas', 'Certificado de notas', '2026-09-11', 'padre-1'),
    );

    const result = await useCase.execute(
      { enrollmentId: 'enrollment-1', type: 'certificado_notas', deliveryMethod: 'digital' },
      user('padre-1'),
    );

    expect(result.status).toBe('lista');
    expect(result.issuedDocumentId).toBe('doc-1');
    expect(createCharge.execute).not.toHaveBeenCalled();
  });

  it('si el tipo es gratis y la entrega es física, queda "lista_para_imprimir"', async () => {
    enrollmentAccess.resolveAccessibleEnrollmentIds.mockResolvedValue(new Set(['enrollment-1']));
    prices.findByType.mockResolvedValue(new DocumentTypePrice('certificado_notas', 0));
    issueDocument.execute.mockResolvedValue(
      new IssuedDocument('doc-1', 'enrollment-1', 'certificado_notas', 'Certificado de notas', '2026-09-11', 'padre-1'),
    );

    const result = await useCase.execute(
      { enrollmentId: 'enrollment-1', type: 'certificado_notas', deliveryMethod: 'fisico' },
      user('padre-1'),
    );

    expect(result.status).toBe('lista_para_imprimir');
  });

  it('si el tipo tiene costo, crea el cargo y la solicitud queda "pendiente_pago" sin generar el PDF', async () => {
    enrollmentAccess.resolveAccessibleEnrollmentIds.mockResolvedValue(new Set(['enrollment-1']));
    prices.findByType.mockResolvedValue(new DocumentTypePrice('certificado_notas', 15000));
    createCharge.execute.mockResolvedValue(
      new Charge('charge-1', 'enrollment-1', 'documento', 'Certificado de notas', 15000, '2026-09-11'),
    );

    const result = await useCase.execute(
      { enrollmentId: 'enrollment-1', type: 'certificado_notas', deliveryMethod: 'digital' },
      user('padre-1'),
    );

    expect(result.status).toBe('pendiente_pago');
    expect(result.chargeId).toBe('charge-1');
    expect(issueDocument.execute).not.toHaveBeenCalled();
  });
});
