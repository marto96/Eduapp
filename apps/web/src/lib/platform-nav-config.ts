import { Building2, type LucideIcon } from 'lucide-react';

export interface PlatformNavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Análogo a `nav-config.ts` (NAV_LINKS) pero para el sidebar de plataforma
 * — hoy un solo módulo (Instituciones), preparado para sumar más ítems
 * de plataforma después (auditoría, config global, etc.) sin reestructurar.
 */
export const PLATFORM_NAV_LINKS: PlatformNavLink[] = [
  { href: '/platform/tenants', label: 'Instituciones', icon: Building2 },
];
