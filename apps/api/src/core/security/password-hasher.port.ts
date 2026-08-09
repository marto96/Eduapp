/**
 * Hashing de contraseñas: infraestructura genérica, no lógica de negocio de
 * ningún módulo — la usan tanto `identity` (usuarios de tenant) como
 * `platform` (superadmins), así que vive en `core/`.
 */
export abstract class PasswordHasherPort {
  abstract hash(plain: string): Promise<string>;
  abstract compare(plain: string, hash: string): Promise<boolean>;
}
