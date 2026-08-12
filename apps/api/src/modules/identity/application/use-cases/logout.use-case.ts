import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../../core/cache/redis.module';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';

/**
 * Revoca un refresh token marcándolo en Redis con TTL igual al tiempo que
 * le quedaba de vida — no hace falta limpieza manual, expira solo.
 * Best-effort: un refresh token inválido/ya expirado no rompe el logout,
 * simplemente no hay nada que revocar.
 */
@Injectable()
export class LogoutUseCase {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async execute(refreshToken: string): Promise<void> {
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      return;
    }

    if (!payload.jti || !payload.exp) return;

    const secondsRemaining = payload.exp - Math.floor(Date.now() / 1000);
    if (secondsRemaining <= 0) return;

    await this.redis.set(`revoked:refresh:${payload.jti}`, '1', 'EX', secondsRemaining);
  }
}
