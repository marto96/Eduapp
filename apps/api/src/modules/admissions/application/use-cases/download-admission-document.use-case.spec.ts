import { DownloadAdmissionDocumentUseCase } from './download-admission-document.use-case';
import { AdmissionDocumentRepositoryPort } from '../ports/admission-document.repository.port';
import { FileStoragePort } from '../../../../core/storage/file-storage.port';
import { AdmissionDocument } from '../../domain/entities/admission-document.entity';

describe('DownloadAdmissionDocumentUseCase', () => {
  const documents: jest.Mocked<AdmissionDocumentRepositoryPort> = {
    findAllByApplication: jest.fn(),
    findByApplicationAndType: jest.fn(),
    save: jest.fn(),
  };
  const storage: jest.Mocked<FileStoragePort> = {
    save: jest.fn(),
    read: jest.fn(),
  };

  const useCase = new DownloadAdmissionDocumentUseCase(documents, storage);

  beforeEach(() => jest.clearAllMocks());

  it('lanza NotFoundException si no hay documento de ese tipo para la solicitud', async () => {
    documents.findByApplicationAndType.mockResolvedValue(null);
    await expect(useCase.execute('app-1', 'foto')).rejects.toThrow('Documento no encontrado');
  });

  it('devuelve el buffer y el nombre original del archivo', async () => {
    documents.findByApplicationAndType.mockResolvedValue(
      new AdmissionDocument('doc-1', 'app-1', 'foto', 'app-1-foto.png', 'foto-original.png', '2026-01-01T00:00:00.000Z'),
    );
    storage.read.mockResolvedValue(Buffer.from('contenido'));

    const result = await useCase.execute('app-1', 'foto');

    expect(storage.read).toHaveBeenCalledWith('admission-documents', 'app-1-foto.png');
    expect(result).toEqual({ buffer: Buffer.from('contenido'), filename: 'foto-original.png' });
  });
});
