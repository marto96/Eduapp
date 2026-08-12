import { Global, Module } from '@nestjs/common';
import { FileStoragePort } from './file-storage.port';
import { LocalDiskFileStorage } from './local-disk-file-storage';

@Global()
@Module({
  providers: [{ provide: FileStoragePort, useClass: LocalDiskFileStorage }],
  exports: [FileStoragePort],
})
export class StorageModule {}
