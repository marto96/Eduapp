/**
 * Superadmin de plataforma (equipo de EduApp), no un usuario de tenant.
 * Vive en el schema `public`, sin `tenantId` — ver ARCHITECTURE.md §3.
 */
export class PlatformAdmin {
  constructor(
    public readonly id: string,
    public email: string,
    private passwordHash: string,
    public fullName: string,
    public status: 'active' | 'suspended',
  ) {}

  getPasswordHash(): string {
    return this.passwordHash;
  }
}
