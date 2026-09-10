import { BadRequestException, Body, Controller, Get, HttpCode, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../../../core/auth/public.decorator';
import { CurrentUser } from '../../../../core/auth/current-user.decorator';
import { JwtPayload } from '../../../../core/auth/jwt-payload.interface';
import { AuditSkip } from '../../../audit/interface/decorators/audit-skip.decorator';
import { AuthenticateUserUseCase } from '../../application/use-cases/authenticate-user.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case';
import { GetCurrentUserUseCase } from '../../application/use-cases/get-current-user.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { ConsumeImpersonationUseCase } from '../../application/use-cases/consume-impersonation.use-case';
import { FileInterceptor } from '@nestjs/platform-express';
import { EditMyProfileUseCase } from '../../application/use-cases/edit-my-profile.use-case';
import { UploadMyProfilePhotoUseCase } from '../../application/use-cases/upload-my-profile-photo.use-case';
import { EditMyProfileDto } from '../dtos/edit-my-profile.dto';
import { LoginDto } from '../dtos/login.dto';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';
import { ConsumeImpersonationDto } from '../dtos/consume-impersonation.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authenticateUser: AuthenticateUserUseCase,
    private readonly refreshToken: RefreshTokenUseCase,
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly logout: LogoutUseCase,
    private readonly consumeImpersonation: ConsumeImpersonationUseCase,
    private readonly editMyProfile: EditMyProfileUseCase,
    private readonly uploadMyProfilePhoto: UploadMyProfilePhotoUseCase,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    return this.authenticateUser.execute(dto);
  }

  @Public()
  @AuditSkip()
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.refreshToken.execute(dto.refreshToken);
  }

  @Public()
  @AuditSkip()
  @Post('impersonate/consume')
  @HttpCode(200)
  async consumeImpersonationCode(@Body() dto: ConsumeImpersonationDto) {
    return this.consumeImpersonation.execute(dto.code);
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
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      impersonatedBy: currentUser.impersonatedBy ?? null,
      tenantId: currentUser.tenantId,
      phone: user.phone,
      photoUrl: user.photoUrl,
      birthDate: user.birthDate,
      documentType: user.documentType,
      documentNumber: user.documentNumber,
      address: user.address,
    };
  }

  // Autogestión: el id objetivo es siempre currentUser.sub — igual que
  // arriba, nunca un :id de la URL. Nunca acepta email ni roles (ver
  // EditMyProfileDto).
  @Patch('me')
  async editMe(@Body() dto: EditMyProfileDto, @CurrentUser() currentUser: JwtPayload) {
    const user = await this.editMyProfile.execute(currentUser.sub, dto);
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      birthDate: user.birthDate,
      documentType: user.documentType,
      documentNumber: user.documentNumber,
      address: user.address,
      phone: user.phone,
    };
  }

  // Autogestión, mismo criterio — el archivo se guarda siempre bajo el id
  // del propio caller.
  @Post('me/photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok = ['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype);
        cb(ok ? null : new BadRequestException('Formato de foto no soportado'), ok);
      },
    }),
  )
  async uploadMyPhoto(@UploadedFile() file: Express.Multer.File, @CurrentUser() currentUser: JwtPayload) {
    const user = await this.uploadMyProfilePhoto.execute(currentUser.sub, {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
    });
    return { photoUrl: user.photoUrl };
  }
}
