/**
 * Entidad de dominio pura. Vive en el schema `public`, no en el de tenant
 * (no confundir con las entidades de negocio de `academic`, `identity`, etc.).
 */
export class Tenant {
  constructor(
    public readonly id: string,
    public name: string,
    public readonly subdomain: string,
    public customDomain: string | null,
    public readonly schemaName: string,
    public status: 'active' | 'suspended',
    public enabledModules: string[],
    public primaryColor: string | null = null,
    public logoUrl: string | null = null,
  ) {}

  suspend(): void {
    this.status = 'suspended';
  }

  hasModuleEnabled(moduleName: string): boolean {
    return this.enabledModules.includes(moduleName);
  }
}
