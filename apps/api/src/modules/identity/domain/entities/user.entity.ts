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

export class User {
  constructor(
    public readonly id: string,
    public email: string,
    private passwordHash: string,
    public firstName: string,
    public lastName: string,
    public roles: UserRole[],
    public status: 'active' | 'invited' | 'suspended',
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
}
