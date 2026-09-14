export interface TenantBranding {
  name: string;
  logoUrl: string | null;
}

/**
 * El nombre/logo del colegio viven en el schema de plataforma
 * (`public.tenants`), no en el schema del tenant donde corre el código
 * que arma y manda emails — este puerto es la única forma en que
 * `EmailTemplateService` los alcanza, sin acoplarse a cómo se resuelve
 * "tenant actual" en cada contexto (request tenant-scoped vs. acción de
 * plataforma sobre un tenant elegido).
 */
export abstract class TenantBrandingPort {
  abstract getCurrentBranding(): Promise<TenantBranding>;
}
