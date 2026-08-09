import { SetMetadata } from '@nestjs/common';
import { AppAbility } from './ability';

export const CHECK_POLICIES_KEY = 'check_policies';

export type PolicyHandler = (ability: AppAbility) => boolean;

/**
 * Restringe una ruta a una o más reglas de ability, ej.:
 * `@CheckPolicies((ability) => ability.can('create', 'AcademicYear'))`.
 * Se evalúa en `PoliciesGuard` contra la ability del usuario, construida
 * por `AbilityFactory` a partir de sus roles.
 */
export const CheckPolicies = (...handlers: PolicyHandler[]) =>
  SetMetadata(CHECK_POLICIES_KEY, handlers);
