/**
 * Entidad de dominio pura: sin decoradores de ORM ni de HTTP.
 * Las reglas de negocio del usuario viven acá, no en el controlador
 * ni en el repositorio.
 */
export type UserRole =
  | 'admin_institucion'
  | 'directivo'
  | 'docente'
  | 'secretaria'
  | 'estudiante'
  | 'padre_tutor';

/** Tipos de documento de identidad vigentes en Colombia (Registraduría Nacional). */
export type DocumentType = 'RC' | 'TI' | 'CC' | 'CE' | 'PA';

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export class User {
  constructor(
    public readonly id: string,
    public email: string,
    private passwordHash: string,
    public firstName: string,
    public lastName: string,
    public roles: UserRole[],
    public status: 'active' | 'invited' | 'suspended',
    private failedLoginAttempts: number = 0,
    private lockedUntil: Date | null = null,
    public birthDate: string | null = null,
    public documentType: DocumentType | null = null,
    public documentNumber: string | null = null,
    public address: string | null = null,
  ) {}

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  hasRole(role: UserRole): boolean {
    return this.roles.includes(role);
  }

  suspend(): void {
    if (this.status === 'suspended') return;
    this.status = 'suspended';
  }

  getPasswordHash(): string {
    return this.passwordHash;
  }

  setPasswordHash(hash: string): void {
    this.passwordHash = hash;
  }

  isLocked(): boolean {
    return this.lockedUntil !== null && this.lockedUntil.getTime() > Date.now();
  }

  /** Cuenta un intento fallido; a partir del 5º, bloquea la cuenta 15 minutos. */
  registerFailedLogin(): void {
    this.failedLoginAttempts += 1;
    if (this.failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      this.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60_000);
      this.failedLoginAttempts = 0;
    }
  }

  resetLoginAttempts(): void {
    this.failedLoginAttempts = 0;
    this.lockedUntil = null;
  }

  getFailedLoginAttempts(): number {
    return this.failedLoginAttempts;
  }

  getLockedUntil(): Date | null {
    return this.lockedUntil;
  }
}
