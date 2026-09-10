import { NotFoundException } from '@nestjs/common';
import { UploadMyProfilePhotoUseCase } from './upload-my-profile-photo.use-case';
import { UserRepositoryPort } from '../ports/user.repository.port';
import { FileStoragePort } from '../../../../core/storage/file-storage.port';
import { User } from '../../domain/entities/user.entity';

describe('UploadMyProfilePhotoUseCase', () => {
  const users: jest.Mocked<UserRepositoryPort> = {
    findByEmail: jest.fn(),
    findByDocumentNumber: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
  };
  const storage: jest.Mocked<FileStoragePort> = {
    save: jest.fn(),
    read: jest.fn(),
  };

  const useCase = new UploadMyProfilePhotoUseCase(users, storage);

  const file = { buffer: Buffer.from('fake'), originalname: 'foto.png', mimetype: 'image/png' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rechaza si el usuario no existe', async () => {
    users.findById.mockResolvedValue(null);

    await expect(useCase.execute('u-1', file)).rejects.toThrow(NotFoundException);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('guarda el archivo con visibilidad pública en la categoría user-photos y persiste la URL', async () => {
    const user = new User('u-1', 'juan@test.com', 'hash', 'Juan', 'Pérez', ['estudiante'], 'active');
    users.findById.mockResolvedValue(user);
    storage.save.mockResolvedValue('http://localhost:3001/uploads/user-photos/user-u-1.png');

    const result = await useCase.execute('u-1', file);

    expect(storage.save).toHaveBeenCalledWith('user-photos', 'user-u-1.png', file, 'public');
    expect(result.photoUrl).toBe('http://localhost:3001/uploads/user-photos/user-u-1.png');
    expect(users.save).toHaveBeenCalledWith(user);
  });

  it('resuelve la extensión a partir del mimetype', async () => {
    const user = new User('u-1', 'juan@test.com', 'hash', 'Juan', 'Pérez', ['estudiante'], 'active');
    users.findById.mockResolvedValue(user);
    storage.save.mockResolvedValue('http://x/foto.jpg');

    await useCase.execute('u-1', { ...file, mimetype: 'image/jpeg', originalname: 'x.jpg' });

    expect(storage.save).toHaveBeenCalledWith('user-photos', 'user-u-1.jpg', expect.anything(), 'public');
  });
});
