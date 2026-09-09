import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../../core/cache/redis.module';
import { TenantRepositoryPort } from '../ports/tenant.repository.port';
import { withTenantSchemaConnection } from '../../infrastructure/tenant-schema-connection';
import { recordPlatformAudit } from '../../infrastructure/record-platform-audit';
import { TypeOrmUserRepository } from '../../../identity/infrastructure/repositories/typeorm-user.repository';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { PlatformJwtPayload } from '../../../../core/auth/platform-jwt-payload.interface';

const HANDOFF_CODE_TTL_SECONDS = 30;

/**
 * Emite un access token de tenant normal (mismo formato que un login real)
 * marcado con `impersonatedBy`, y lo guarda en Redis bajo un código de un
 * solo uso — el JWT en sí nunca viaja en una URL ni queda en logs. No emite
 * refresh token: la sesión de impersonación expira sola, sin forma de
 * renovarse (ver Global Constraints del plan).
 */
@Injectable()
export class PlatformImpersonateTenantUserUseCase {
  constructor(
    @Inject(TenantRepositoryPort) private readonly tenants: TenantRepositoryPort,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async execute(
    tenantId: string,
    userId: string,
    platformAdmin: PlatformJwtPayload,
  ): Promise<{ handoffUrl: string }> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`No existe la institución "${tenantId}"`);
    }

    return withTenantSchemaConnection(tenant.schemaName, async (dataSource) => {
      const users = new TypeOrmUserRepository(dataSource);
      const user = await users.findById(userId);
      if (!user) {
        throw new NotFoundException(`No existe el usuario "${userId}"`);
      }
      if (user.status !== 'active') {
        throw new BadRequestException('No se puede impersonar a un usuario que no está activo');
      }

      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        roles: user.roles,
        tenantId: tenant.id,
        impersonatedBy: platformAdmin.sub,
      };
      const accessToken = this.jwt.sign(payload, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('IMPERSONATION_SESSION_EXPIRES_IN'),
      });

      const code = randomUUID();
      await this.redis.set(`impersonation:handoff:${code}`, accessToken, 'EX', HANDOFF_CODE_TTL_SECONDS);

      await recordPlatformAudit(dataSource, 'impersonate', 'User', user.id, platformAdmin);

      const baseDomain = this.config.get<string>('TENANT_BASE_DOMAIN')!;
      const host = tenant.customDomain ?? `${tenant.subdomain}.${baseDomain}`;
      const protocol = host.includes('localhost') ? 'http' : 'https';

      return { handoffUrl: `${protocol}://${host}/impersonate/consume?code=${code}` };
    });
  }
}
