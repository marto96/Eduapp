import type { TenantUser } from '@eduapp/shared-types';

export const STATUS_LABELS: Record<TenantUser['status'], string> = {
  active: 'Activo',
  invited: 'Invitado',
  suspended: 'Inactivo',
};

export const STATUS_BADGE_CLASSES: Record<TenantUser['status'], string> = {
  active: 'bg-primary/10 text-primary',
  invited: 'bg-muted text-muted-foreground',
  suspended: 'bg-destructive/10 text-destructive',
};

export const STATUS_DOT_CLASSES: Record<TenantUser['status'], string> = {
  active: 'bg-primary',
  invited: 'bg-muted-foreground/50',
  suspended: 'bg-destructive',
};
