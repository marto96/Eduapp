import { Global, Module } from '@nestjs/common';
import { TenantRegistryService } from './tenant-registry.service';
import { TenantPublicController } from './tenant-public.controller';
import { PlatformModule } from '../../modules/platform/platform.module';

@Global()
@Module({
  imports: [PlatformModule],
  controllers: [TenantPublicController],
  providers: [TenantRegistryService],
  exports: [TenantRegistryService],
})
export class TenantModule {}
