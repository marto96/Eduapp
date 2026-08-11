import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../../../../core/auth/public.decorator';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { AuthenticatePlatformAdminUseCase } from '../../application/use-cases/authenticate-platform-admin.use-case';
import { PlatformLoginDto } from '../dtos/platform-login.dto';
import { PlatformJwtPayload } from '../../../../core/auth/platform-jwt-payload.interface';

@Controller('platform/auth')
@Public()
export class PlatformAuthController {
  constructor(private readonly authenticateAdmin: AuthenticatePlatformAdminUseCase) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: PlatformLoginDto) {
    return this.authenticateAdmin.execute(dto);
  }

  @Get('me')
  @UseGuards(PlatformAdminGuard)
  me(@Req() req: Request & { platformAdmin: PlatformJwtPayload }) {
    return req.platformAdmin;
  }
}
