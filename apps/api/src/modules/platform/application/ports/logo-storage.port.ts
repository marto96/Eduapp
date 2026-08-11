/**
 * Puerto para guardar el logo de una institución. Implementación concreta
 * en infrastructure/ (hoy disco local — ver `LocalDiskLogoStorage`). El
 * método siempre devuelve una URL absoluta y públicamente accesible, para
 * que el día que se agregue un adapter de cloud storage (S3, etc.) el
 * cambio quede contenido a esa clase nueva, sin tocar casos de uso ni
 * frontend.
 */
export interface LogoFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

export abstract class LogoStoragePort {
  abstract save(tenantId: string, file: LogoFile): Promise<string>;
}
