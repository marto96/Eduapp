import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { extname } from 'node:path';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { FileStoragePort, StoredFile } from '../../../../core/storage/file-storage.port';
import { Tenant } from '../../domain/entities/tenant.entity';

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
};

@Injectable()
export class UpdateTenantLogoUseCase {
  constructor(
    @Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort,
    @Inject(FileStoragePort) private readonly storage: FileStoragePort,
  ) {}

  async execute(id: string, file: StoredFile): Promise<Tenant> {
    const tenant = await this.tenants.findById(id);
    if (!tenant) {
      throw new NotFoundException(`No existe la institución "${id}"`);
    }

    const ext = EXTENSION_BY_MIME[file.mimetype] ?? extname(file.originalname).replace('.', '') ?? 'bin';
    tenant.logoUrl = await this.storage.save('logos', `logo-${id}.${ext}`, file, 'public');
    await this.tenants.save(tenant);
    return tenant;
  }
}
