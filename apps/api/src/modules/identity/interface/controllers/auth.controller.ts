import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../../../core/auth/public.decorator';
import { CurrentUser } from '../../../../core/auth/current-user.decorator';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { AuthenticateUserUseCase } from '../../application/use-cases/authenticate-user.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case';
import { GetCurrentUserUseCase } from '../../application/use-cases/get-current-user.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { LoginDto } from '../dtos/login.dto';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authenticateUser: AuthenticateUserUseCase,
    private readonly refreshToken: RefreshTokenUseCase,
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly logout: LogoutUseCase,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    return this.authenticateUser.execute(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.refreshToken.execute(dto.refreshToken);
  }

  // Autogestión: sin @CheckPolicies a propósito — el refresh token a
  // revocar viene del body, nunca de un :id de otro usuario, así que solo
  // puede cerrar la sesión que el propio caller ya posee.
  @Post('logout')
  @HttpCode(200)
  async logoutSession(@Body() dto: RefreshTokenDto) {
    await this.logout.execute(dto.refreshToken);
    return { ok: true };
  }

  // Autogestión: igual criterio que arriba — devuelve solo el usuario del
  // JWT actual (`currentUser.sub`), nunca datos de otro usuario.
  @Get('me')
  async me(@CurrentUser() currentUser: JwtPayload) {
    const user = await this.getCurrentUser.execute(currentUser.sub);
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles,
    };
  }
}
