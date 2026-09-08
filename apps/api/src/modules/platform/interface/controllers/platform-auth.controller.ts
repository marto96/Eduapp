import { Body, Controller, Get, HttpCode, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../../../../core/auth/public.decorator';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { PlatformAdminRepositoryPort } from '../../application/ports/platform-admin.repository.port';
import { AuthenticatePlatformAdminUseCase } from '../../application/use-cases/authenticate-platform-admin.use-case';
import { SetupPlatformAdminTotpUseCase } from '../../application/use-cases/setup-platform-admin-totp.use-case';
import { ConfirmPlatformAdminTotpUseCase } from '../../application/use-cases/confirm-platform-admin-totp.use-case';
import { VerifyPlatformAdminTotpUseCase } from '../../application/use-cases/verify-platform-admin-totp.use-case';
import { PlatformLoginDto } from '../dtos/platform-login.dto';
import { ConfirmTotpDto } from '../dtos/confirm-totp.dto';
import { VerifyTwoFactorDto } from '../dtos/verify-two-factor.dto';
import { PlatformJwtPayload } from '../../../../core/auth/platform-jwt-payload.interface';

@Controller('platform/auth')
@Public()
export class PlatformAuthController {
  constructor(
    @Inject(PlatformAdminRepositoryPort) private readonly admins: PlatformAdminRepositoryPort,
    private readonly authenticateAdmin: AuthenticatePlatformAdminUseCase,
    private readonly setupTotp: SetupPlatformAdminTotpUseCase,
    private readonly confirmTotp: ConfirmPlatformAdminTotpUseCase,
    private readonly verifyTotp: VerifyPlatformAdminTotpUseCase,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: PlatformLoginDto) {
    return this.authenticateAdmin.execute(dto);
  }

  @Post('login/verify-2fa')
  @HttpCode(200)
  async loginVerifyTwoFactor(@Body() dto: VerifyTwoFactorDto) {
    return this.verifyTotp.execute(dto);
  }

  @Get('me')
  @UseGuards(PlatformAdminGuard)
  async me(@Req() req: Request & { platformAdmin: PlatformJwtPayload }) {
    const admin = await this.admins.findById(req.platformAdmin.sub);
    return {
      sub: req.platformAdmin.sub,
      email: req.platformAdmin.email,
      totpEnabled: admin?.totpEnabled ?? false,
    };
  }

  @Post('2fa/setup')
  @UseGuards(PlatformAdminGuard)
  async setupTwoFactor(@Req() req: Request & { platformAdmin: PlatformJwtPayload }) {
    return this.setupTotp.execute(req.platformAdmin.sub);
  }

  @Post('2fa/confirm')
  @HttpCode(200)
  @UseGuards(PlatformAdminGuard)
  async confirmTwoFactor(
    @Req() req: Request & { platformAdmin: PlatformJwtPayload },
    @Body() dto: ConfirmTotpDto,
  ) {
    await this.confirmTotp.execute(req.platformAdmin.sub, dto.code);
    return { success: true };
  }
}
