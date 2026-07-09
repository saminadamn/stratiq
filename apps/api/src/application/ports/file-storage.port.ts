export interface SavedFile {
  storedFileName: string;
  storagePath: string;
  fileSizeBytes: number;
  checksumSha256: string;
}

export interface FileStorage {
  save(input: {
    organizationId: string;
    originalFileName: string;
    buffer: Buffer;
  }): Promise<SavedFile>;
  delete(storagePath: string): Promise<void>;
}
