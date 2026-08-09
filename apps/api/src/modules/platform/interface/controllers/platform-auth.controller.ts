import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Public } from '../../../../core/auth/public.decorator';
import { AuthenticatePlatformAdminUseCase } from '../../application/use-cases/authenticate-platform-admin.use-case';
import { PlatformLoginDto } from '../dtos/platform-login.dto';

@Controller('platform/auth')
@Public()
export class PlatformAuthController {
  constructor(private readonly authenticateAdmin: AuthenticatePlatformAdminUseCase) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: PlatformLoginDto) {
    return this.authenticateAdmin.execute(dto);
  }
}
