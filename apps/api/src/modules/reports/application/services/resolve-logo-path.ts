import { join } from 'node:path';

/**
 * `tenant.logoUrl` es una URL pública absoluta con cache-busting
 * (`{API_PUBLIC_URL}/uploads/logos/logo-{tenantId}.{ext}?v=...`, ver
 * `LocalDiskFileStorage`) — para incrustarlo con `doc.image()` hace falta
 * la ruta real en disco, no la URL.
 */
export function buildLogoDiskPath(logoUrl: string, uploadsDir: string): string {
  const { pathname } = new URL(logoUrl);
  const relative = pathname.replace(/^\/uploads\//, '');
  return join(process.cwd(), uploadsDir, relative);
}
