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
    /** Secreto TOTP en base32 — `null` mientras no se activó 2FA, o mientras el alta está pendiente de confirmación. */
    private totpSecret: string | null = null,
    public totpEnabled: boolean = false,
    /** Hashes bcrypt de los códigos de recuperación de un solo uso. `null` = 2FA nunca configurado. */
    private recoveryCodeHashes: string[] | null = null,
  ) {}

  getPasswordHash(): string {
    return this.passwordHash;
  }

  getTotpSecret(): string | null {
    return this.totpSecret;
  }

  getRecoveryCodeHashes(): string[] | null {
    return this.recoveryCodeHashes;
  }

  /** Guarda un secreto nuevo como pendiente — `totpEnabled` sigue en `false` hasta `confirmTotp`. */
  startTotpSetup(secret: string, recoveryCodeHashes: string[]): void {
    this.totpSecret = secret;
    this.totpEnabled = false;
    this.recoveryCodeHashes = recoveryCodeHashes;
  }

  confirmTotp(): void {
    if (!this.totpSecret) {
      throw new Error('No hay ningún alta de 2FA pendiente para confirmar');
    }
    this.totpEnabled = true;
  }

  /** Un código de recuperación es de un solo uso: se saca de la lista apenas se valida. */
  consumeRecoveryCodeHash(hash: string): void {
    if (!this.recoveryCodeHashes) return;
    this.recoveryCodeHashes = this.recoveryCodeHashes.filter((h) => h !== hash);
  }
}
