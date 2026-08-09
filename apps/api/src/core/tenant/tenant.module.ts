import { Global, Module } from '@nestjs/common';
import { TenantRegistryService } from './tenant-registry.service';
import { PlatformModule } from '../../modules/platform/platform.module';

@Global()
@Module({
  imports: [PlatformModule],
  providers: [TenantRegistryService],
  exports: [TenantRegistryService],
})
export class TenantModule {}
