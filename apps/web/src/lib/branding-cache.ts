const STORAGE_KEY = 'tenant-branding-cache';

export interface CachedBranding {
  name: string;
  logoUrl: string | null;
}

/**
 * El logo/nombre del tenant se resuelve server-side (`getTenantBranding`,
 * sin cache HTTP) en el layout del dashboard — no hay forma de pasárselo a
 * `loading.tsx` (se renderiza como hermano del layout, no como hijo, y no
 * puede esperar su propio fetch sin perder el sentido de ser un loader).
 * En su lugar, el Sidebar cachea el último valor visto en localStorage, y
 * el loader lo lee de ahí — sin red, sin esperar nada.
 */
export function cacheBranding(branding: CachedBranding): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(branding));
  } catch {
    // localStorage inaccesible (modo privado, etc.) — el loader cae al default.
  }
}

export function readCachedBranding(): CachedBranding | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CachedBranding) : null;
  } catch {
    return null;
  }
}
