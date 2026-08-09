import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from './jwt-payload.interface';

/**
 * Extrae el usuario autenticado (el `payload` ya validado por JwtStrategy)
 * del request. Solo funciona detrás de `JwtAuthGuard`.
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): JwtPayload => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
