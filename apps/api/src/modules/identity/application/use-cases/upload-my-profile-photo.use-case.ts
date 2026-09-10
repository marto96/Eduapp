import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { extname } from 'node:path';
import { UserRepositoryPort } from '../ports/user.repository.port';
import { FileStoragePort, StoredFile } from '../../../../core/storage/file-storage.port';
import { User } from '../../domain/entities/user.entity';

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

@Injectable()
export class UploadMyProfilePhotoUseCase {
  constructor(
    @Inject(UserRepositoryPort) private readonly users: UserRepositoryPort,
    @Inject(FileStoragePort) private readonly storage: FileStoragePort,
  ) {}

  async execute(userId: string, file: StoredFile): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const ext = EXTENSION_BY_MIME[file.mimetype] ?? extname(file.originalname).replace('.', '') ?? 'bin';
    user.photoUrl = await this.storage.save('user-photos', `user-${userId}.${ext}`, file, 'public');
    await this.users.save(user);
    return user;
  }
}
