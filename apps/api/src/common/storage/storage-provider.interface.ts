export interface SavedFile {
  storageKey: string;
  url?: string;
}

export interface StorageProvider {
  save(params: {
    organizationId: string;
    workOrderId: string;
    fileName: string;
    mimeType: string;
    content: Buffer;
  }): Promise<SavedFile>;
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');
