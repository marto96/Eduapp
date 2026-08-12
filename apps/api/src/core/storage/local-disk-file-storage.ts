import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FileStoragePort, FileVisibility, StoredFile } from './file-storage.port';

/**
 * `public` guarda bajo `UPLOADS_DIR` (servido por `ServeStaticModule` en
 * `/uploads`, ver `app.module.ts`) y devuelve una URL absoluta. `private`
 * guarda bajo `PRIVATE_UPLOADS_DIR`, un directorio que `ServeStaticModule`
 * no sirve — nunca es alcanzable por HTTP directo, solo vía `read()` desde
 * un controller autenticado.
 */
@Injectable()
export class LocalDiskFileStorage extends FileStoragePort {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async save(
    category: string,
    filename: string,
    file: StoredFile,
    visibility: FileVisibility,
  ): Promise<string> {
    const baseDir = this.baseDir(visibility);
    const categoryDir = join(baseDir, category);
    mkdirSync(categoryDir, { recursive: true });
    writeFileSync(join(categoryDir, filename), file.buffer);

    if (visibility === 'public') {
      const publicUrl = this.config.get<string>('API_PUBLIC_URL') ?? 'http://localhost:3001';
      return `${publicUrl}/uploads/${category}/${filename}?v=${Date.now()}`;
    }

    return `${category}/${filename}`;
  }

  async read(category: string, filename: string): Promise<Buffer> {
    const baseDir = this.baseDir('private');
    return readFileSync(join(baseDir, category, filename));
  }

  private baseDir(visibility: FileVisibility): string {
    return visibility === 'public'
      ? (this.config.get<string>('UPLOADS_DIR') ?? './uploads')
      : (this.config.get<string>('PRIVATE_UPLOADS_DIR') ?? './private-uploads');
  }
}
