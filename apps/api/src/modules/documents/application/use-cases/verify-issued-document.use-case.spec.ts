import { VerifyIssuedDocumentUseCase } from './verify-issued-document.use-case';
import { IssuedDocumentRepositoryPort } from '../ports/issued-document.repository.port';
import { EnrollmentRepositoryPort } from '../../../enrollment/application/ports/enrollment.repository.port';
import { UserRepositoryPort } from '../../../identity/application/ports/user.repository.port';
import { IssuedDocument } from '../../domain/entities/issued-document.entity';
import { Enrollment } from '../../../enrollment/domain/entities/enrollment.entity';
import { User } from '../../../identity/domain/entities/user.entity';
import { TenantRegistryService } from '../../../../core/tenant/tenant-registry.service';
import { getCurrentTenant } from '../../../../core/tenant/tenant-context';

jest.mock('../../../../core/tenant/tenant-context', () => ({ getCurrentTenant: jest.fn() }));

describe('VerifyIssuedDocumentUseCase', () => {
  const documents: jest.Mocked<IssuedDocumentRepositoryPort> = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };
  const enrollments: jest.Mocked<EnrollmentRepositoryPort> = {
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    findById: jest.fn(),
    findActiveByStudentAndYear: jest.fn(),
    save: jest.fn(),
  };
  const users: jest.Mocked<UserRepositoryPort> = {
    findByEmail: jest.fn(),
    findByDocumentNumber: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };
  const tenantRegistry = { resolveByHost: jest.fn() } as unknown as jest.Mocked<TenantRegistryService>;

  const useCase = new VerifyIssuedDocumentUseCase(documents, enrollments, users, tenantRegistry);

  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentTenant as jest.Mock).mockReturnValue({ subdomain: 'colegio-demo' });
  });

  it('lanza NotFoundException si el documento no existe', async () => {
    documents.findById.mockResolvedValue(null);
    await expect(useCase.execute('doc-1')).rejects.toThrow('Documento no encontrado');
  });

  it('devuelve los datos públicos de un documento vigente', async () => {
    documents.findById.mockResolvedValue(
      new IssuedDocument('doc-1', 'enrollment-1', 'certificado_notas', 'Certificado', '2026-09-11', 'admin-1'),
    );
    enrollments.findById.mockResolvedValue(
      new Enrollment('enrollment-1', 'student-1', 'section-1', 'year-1', 'active'),
    );
    users.findById.mockResolvedValue({ fullName: 'Juan Perez' } as User);
    tenantRegistry.resolveByHost.mockResolvedValue({ name: 'Colegio Demo' } as never);

    const output = await useCase.execute('doc-1');

    expect(output).toEqual({
      type: 'certificado_notas',
      studentName: 'Juan Perez',
      institutionName: 'Colegio Demo',
      issuedAt: '2026-09-11',
      voided: false,
    });
  });

  it('marca voided:true si el documento fue anulado', async () => {
    const voidedDocument = new IssuedDocument(
      'doc-1', 'enrollment-1', 'certificado_notas', 'Certificado', '2026-09-11', 'admin-1',
    );
    voidedDocument.markVoided();
    documents.findById.mockResolvedValue(voidedDocument);
    enrollments.findById.mockResolvedValue(null);
    tenantRegistry.resolveByHost.mockResolvedValue(null);

    const output = await useCase.execute('doc-1');

    expect(output.voided).toBe(true);
    expect(output.studentName).toBe('Estudiante');
    expect(output.institutionName).toBe('Skolaria');
  });
});
