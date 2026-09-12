import { ListAdmissionDocumentsUseCase } from './list-admission-documents.use-case';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { AdmissionDocumentRepositoryPort } from '../ports/admission-document.repository.port';
import { AdmissionApplication } from '../../domain/entities/admission-application.entity';
import { AdmissionDocument } from '../../domain/entities/admission-document.entity';

describe('ListAdmissionDocumentsUseCase', () => {
  const applications: jest.Mocked<AdmissionApplicationRepositoryPort> = {
    findById: jest.fn(),
    findByTrackingCode: jest.fn(),
    findPendingByDocumentNumber: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };
  const documents: jest.Mocked<AdmissionDocumentRepositoryPort> = {
    findAllByApplication: jest.fn(),
    findByApplicationAndType: jest.fn(),
    save: jest.fn(),
  };

  const useCase = new ListAdmissionDocumentsUseCase(applications, documents);

  beforeEach(() => jest.clearAllMocks());

  it('lanza NotFoundException si el tracking code no existe', async () => {
    applications.findByTrackingCode.mockResolvedValue(null);
    await expect(useCase.execute('SOL-NOPE')).rejects.toThrow('Solicitud no encontrada');
  });

  it('devuelve los documentos de la solicitud resuelta por tracking code', async () => {
    const application = new AdmissionApplication(
      'app-1', 'SOL-A8F3K2', 'Juan', 'Pérez', '2015-05-20', 'TI', '1098765432', 'Calle 1 # 2-3',
      'grade-1', 'year-2026', 'María Pérez', 'maria@test.com', '3001234567',
      'pendiente_entrevista', 150000, null, null, null, null, null, null,
      '2026-01-01T00:00:00.000Z',
    );
    applications.findByTrackingCode.mockResolvedValue(application);
    const docs = [new AdmissionDocument('doc-1', 'app-1', 'foto', 'key', 'foto.png', '2026-01-01T00:00:00.000Z')];
    documents.findAllByApplication.mockResolvedValue(docs);

    const result = await useCase.execute('SOL-A8F3K2');

    expect(documents.findAllByApplication).toHaveBeenCalledWith('app-1');
    expect(result).toBe(docs);
  });
});
