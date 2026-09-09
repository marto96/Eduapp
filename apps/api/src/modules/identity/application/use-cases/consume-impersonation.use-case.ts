import { GoneException, Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../../core/cache/redis.module';

/**
 * Canjea un código de handoff de impersonación por el access token real —
 * de un solo uso, el código se borra apenas se lee. Ver
 * `PlatformImpersonateTenantUserUseCase`, que es quien lo genera.
 */
@Injectable()
export class ConsumeImpersonationUseCase {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async execute(code: string): Promise<{ accessToken: string }> {
    const key = `impersonation:handoff:${code}`;
    const accessToken = await this.redis.get(key);
    if (!accessToken) {
      throw new GoneException('El enlace de acceso venció, pedí uno nuevo desde el panel');
    }
    await this.redis.del(key);
    return { accessToken };
  }
}
