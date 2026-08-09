import { Ability } from '@casl/ability';

/**
 * Acciones y recursos de negocio conocidos por el sistema de permisos.
 * Se amplía a medida que se implementan más módulos (ej. `Tenant`,
 * `Enrollment`, `Invoice`...). Chequeo por tipo de recurso (no por
 * instancia todavía): alcanza para "puede crear años lectivos" pero no
 * para reglas como "solo sus propias secciones" — eso queda para más
 * adelante si hace falta.
 */
export type AppAction = 'manage' | 'create' | 'read' | 'update' | 'delete';
export type AppSubjects = 'AcademicYear' | 'Grade' | 'Section' | 'all';

export type AppAbility = Ability<[AppAction, AppSubjects]>;
