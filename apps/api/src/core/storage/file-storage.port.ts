/**
 * Puerto genérico de almacenamiento de archivos — reemplaza al
 * `LogoStoragePort` específico de plataforma (sesión anterior), ahora que
 * hay 3 casos de uso reales (logo de tenant, PDF de documento emitido,
 * adjunto de mensaje) que solo difieren en si el archivo debe ser público
 * o no.
 *
 * `visibility: 'public'` guarda bajo la ruta servida por `ServeStaticModule`
 * (`/uploads`) y devuelve una URL absoluta lista para usar en un `<img>`/
 * `<a>` — pensado para el logo institucional, que es intencionalmente
 * público. `visibility: 'private'` guarda fuera de esa ruta estática y
 * devuelve solo una storage key opaca (no una URL fetcheable) — el llamador
 * la persiste y la resuelve más tarde vía `read()` desde un controller
 * autenticado que valide acceso antes de stream-ear el archivo. Pensado
 * para documentos emitidos y adjuntos de mensajes, que son de un
 * estudiante/conversación puntual, no público como el logo.
 */
export interface StoredFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

export type FileVisibility = 'public' | 'private';

export abstract class FileStoragePort {
  abstract save(
    category: string,
    filename: string,
    file: StoredFile,
    visibility: FileVisibility,
  ): Promise<string>;

  abstract read(category: string, filename: string): Promise<Buffer>;
}
