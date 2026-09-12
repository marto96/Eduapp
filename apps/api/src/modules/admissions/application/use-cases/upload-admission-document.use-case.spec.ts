import { UploadAdmissionDocumentUseCase } from './upload-admission-document.use-case';
import { AdmissionApplicationRepositoryPort } from '../ports/admission-application.repository.port';
import { AdmissionDocumentRepositoryPort } from '../ports/admission-document.repository.port';
import { FileStoragePort } from '../../../../core/storage/file-storage.port';
import { AdmissionApplication } from '../../domain/entities/admission-application.entity';
import { AdmissionDocument } from '../../domain/entities/admission-document.entity';

describe('UploadAdmissionDocumentUseCase', () => {
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
  const storage: jest.Mocked<FileStoragePort> = {
    save: jest.fn(),
    read: jest.fn(),
  };

  const useCase = new UploadAdmissionDocumentUseCase(applications, documents, storage);

  const application = () =>
    new AdmissionApplication(
      'app-1', 'SOL-A8F3K2', 'Juan', 'Pérez', '2015-05-20', 'TI', '1098765432', 'Calle 1 # 2-3',
      'grade-1', 'year-2026', 'María Pérez', 'maria@test.com', '3001234567',
      'pendiente_entrevista', 150000, null, null, null, null, null, null,
      '2026-01-01T00:00:00.000Z',
    );

  const file = { buffer: Buffer.from('x'), originalname: 'foto.png', mimetype: 'image/png' };

  beforeEach(() => jest.clearAllMocks());

  it('lanza NotFoundException si el tracking code no corresponde a ninguna solicitud', async () => {
    applications.findByTrackingCode.mockResolvedValue(null);

    await expect(useCase.execute('SOL-NOPE', 'foto', file)).rejects.toThrow('Solicitud no encontrada');
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('crea el documento la primera vez que se sube ese tipo', async () => {
    applications.findByTrackingCode.mockResolvedValue(application());
    documents.findByApplicationAndType.mockResolvedValue(null);

    const result = await useCase.execute('SOL-A8F3K2', 'foto', file);

    expect(storage.save).toHaveBeenCalledWith('admission-documents', 'app-1-foto.png', file, 'private');
    expect(documents.save).toHaveBeenCalledTimes(1);
    expect(result.type).toBe('foto');
    expect(result.storageKey).toBe('app-1-foto.png');
  });

  it('reemplaza el documento existente si ya se había subido ese tipo antes', async () => {
    applications.findByTrackingCode.mockResolvedValue(application());
    const existing = new AdmissionDocument('doc-1', 'app-1', 'foto', 'app-1-foto.jpg', 'vieja.jpg', '2026-01-01T00:00:00.000Z');
    documents.findByApplicationAndType.mockResolvedValue(existing);

    const result = await useCase.execute('SOL-A8F3K2', 'foto', file);

    expect(result).toBe(existing);
    expect(result.storageKey).toBe('app-1-foto.png');
    expect(result.originalFilename).toBe('foto.png');
    expect(documents.save).toHaveBeenCalledWith(existing);
  });
});
