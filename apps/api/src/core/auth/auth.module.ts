import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AbilityFactory } from './casl/ability.factory';
import { PoliciesGuard } from './casl/policies.guard';

/**
 * Infra de auth compartida por todos los módulos de negocio: JwtService
 * (usado por `JwtTokenIssuer` en identity para firmar tokens) y los guards
 * globales. Los módulos de negocio no necesitan aplicar `@UseGuards`
 * manualmente: todas las rutas requieren JWT válido salvo que estén
 * marcadas con `@Public()`.
 */
@Global()
@Module({
  imports: [
    PassportModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_ACCESS_EXPIRES_IN') },
      }),
    }),
    // Límite general de API (20 req/min por IP); endpoints puntuales como
    // /auth/login lo endurecen con @Throttle propio.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }]),
  ],
  providers: [
    JwtStrategy,
    AbilityFactory,
    // El throttler corre primero: rechaza de una fuerza bruta sin gastar
    // ciclos en JwtAuthGuard/PoliciesGuard.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PoliciesGuard },
  ],
  exports: [JwtModule],
})
export class AuthModule {}
