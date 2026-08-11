import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { LogoFile, LogoStoragePort } from '../../application/ports/logo-storage.port';

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
};

/**
 * Guarda el logo en disco local, con nombre estable por tenant (se
 * sobrescribe en cada re-subida — no hay job de limpieza en el proyecto,
 * así que un nombre con timestamp iría acumulando archivos huérfanos). El
 * query param `?v=` evita que el navegador sirva una versión vieja desde
 * cache tras reemplazar el logo.
 */
@Injectable()
export class LocalDiskLogoStorage extends LogoStoragePort {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async save(tenantId: string, file: LogoFile): Promise<string> {
    const ext = EXTENSION_BY_MIME[file.mimetype] ?? extname(file.originalname).replace('.', '') ?? 'bin';
    const uploadsDir = this.config.get<string>('UPLOADS_DIR') ?? './uploads';
    const tenantsDir = join(uploadsDir, 'tenants');
    mkdirSync(tenantsDir, { recursive: true });

    const filename = `logo-${tenantId}.${ext}`;
    writeFileSync(join(tenantsDir, filename), file.buffer);

    const publicUrl = this.config.get<string>('API_PUBLIC_URL') ?? 'http://localhost:3001';
    return `${publicUrl}/uploads/tenants/${filename}?v=${Date.now()}`;
  }
}
