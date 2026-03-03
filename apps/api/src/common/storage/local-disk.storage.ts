import { Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { StorageProvider } from './storage-provider.interface.js';

@Injectable()
export class LocalDiskStorageProvider implements StorageProvider {
  private readonly rootDir =
    process.env.DEV_UPLOAD_DIR?.trim() || join(process.cwd(), '.tmp', 'uploads');

  async save(params: {
    organizationId: string;
    workOrderId: string;
    fileName: string;
    mimeType: string;
    content: Buffer;
  }) {
    const safeExtension = extname(params.fileName || '').toLowerCase();
    const extension =
      safeExtension.length > 0 ? safeExtension : params.mimeType === 'image/png' ? '.png' : '.jpg';
    const fileName = `${Date.now()}-${randomUUID()}${extension}`;
    const relativeDir = join(params.organizationId, params.workOrderId);
    const dirPath = join(this.rootDir, relativeDir);
    await mkdir(dirPath, { recursive: true });
    const filePath = join(dirPath, fileName);
    await writeFile(filePath, params.content);
    return {
      storageKey: join(relativeDir, fileName).replaceAll('\\', '/'),
    };
  }
}
