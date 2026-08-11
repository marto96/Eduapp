import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from '../../../../core/auth/public.decorator';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { CreateTenantUseCase } from '../../application/use-cases/create-tenant.use-case';
import { ListTenantsUseCase } from '../../application/use-cases/list-tenants.use-case';
import { GetTenantUseCase } from '../../application/use-cases/get-tenant.use-case';
import { UpdateTenantUseCase } from '../../application/use-cases/update-tenant.use-case';
import { UpdateTenantLogoUseCase } from '../../application/use-cases/update-tenant-logo.use-case';
import { CreateTenantDto } from '../dtos/create-tenant.dto';
import { UpdateTenantDto } from '../dtos/update-tenant.dto';

const ALLOWED_LOGO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];

/**
 * Rutas de plataforma: no requieren JWT de tenant (no hay tenant resuelto
 * en estas rutas, ver exclusión en app.module.ts), se protegen con
 * `PlatformAdminGuard` en su lugar.
 */
@Controller('platform/tenants')
@Public()
@UseGuards(PlatformAdminGuard)
export class TenantsController {
  constructor(
    private readonly createTenant: CreateTenantUseCase,
    private readonly listTenants: ListTenantsUseCase,
    private readonly getTenant: GetTenantUseCase,
    private readonly updateTenant: UpdateTenantUseCase,
    private readonly updateTenantLogo: UpdateTenantLogoUseCase,
  ) {}

  @Post()
  async create(@Body() dto: CreateTenantDto) {
    return this.createTenant.execute(dto);
  }

  @Get()
  async list() {
    return this.listTenants.execute();
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.getTenant.execute(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.updateTenant.execute(id, dto);
  }

  @Post(':id/logo')
  @UseInterceptors(
    FileInterceptor('logo', {
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok = ALLOWED_LOGO_MIME_TYPES.includes(file.mimetype);
        cb(ok ? null : new BadRequestException('Formato de logo no soportado'), ok);
      },
    }),
  )
  async uploadLogo(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.updateTenantLogo.execute(id, {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
    });
  }
}
