import { Global, Module } from '@nestjs/common';
import { LocalDiskStorageProvider } from './local-disk.storage.js';
import { STORAGE_PROVIDER } from './storage-provider.interface.js';

@Global()
@Module({
  providers: [
    LocalDiskStorageProvider,
    {
      provide: STORAGE_PROVIDER,
      useExisting: LocalDiskStorageProvider,
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
