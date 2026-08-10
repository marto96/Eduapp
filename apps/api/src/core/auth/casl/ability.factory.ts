import { Injectable } from '@nestjs/common';
import { Ability, AbilityBuilder, AbilityClass } from '@casl/ability';
import { AppAbility } from './ability';
import { JwtPayload } from '../jwt-payload.interface';

/**
 * Construye las abilities del usuario a partir de los roles del JWT (ya
 * validados por tenant en `JwtStrategy`). Mismo comportamiento que tenía
 * `RolesGuard` (solo admin/directivo pueden crear estructura académica),
 * pero expresado como reglas reales por acción+recurso.
 */
@Injectable()
export class AbilityFactory {
  createForUser(payload: JwtPayload): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(Ability as AbilityClass<AppAbility>);
    const roles = payload.roles;

    if (roles.includes('admin_institucion')) {
      can('manage', 'all');
    }

    if (roles.includes('directivo')) {
      can('manage', ['AcademicYear', 'Grade', 'Section', 'User', 'Enrollment']);
      can('read', 'all');
    }

    if (roles.some((role) => ['docente', 'secretaria', 'estudiante', 'padre_tutor'].includes(role))) {
      // 'read' en User (no 'manage': no pueden crear/editar) para poder
      // resolver nombres en listados que referencian usuarios (ej. la
      // matrícula muestra "Juan Pérez", no un UUID).
      can('read', ['AcademicYear', 'Grade', 'Section', 'Enrollment', 'User']);
    }

    return build();
  }
}
