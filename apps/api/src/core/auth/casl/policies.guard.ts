import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CHECK_POLICIES_KEY, PolicyHandler } from './policies.decorator';
import { AbilityFactory } from './ability.factory';
import { JwtPayload } from '../jwt-payload.interface';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const handlers = this.reflector.getAllAndOverride<PolicyHandler[]>(CHECK_POLICIES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!handlers || handlers.length === 0) return true;

    const user = context.switchToHttp().getRequest().user as JwtPayload | undefined;
    if (!user) return false;

    const ability = this.abilityFactory.createForUser(user);
    const allowed = handlers.every((handler) => handler(ability));
    if (!allowed) {
      throw new ForbiddenException('No tenés permisos para esta acción');
    }
    return true;
  }
}
