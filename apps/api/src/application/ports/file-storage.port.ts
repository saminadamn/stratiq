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
  // v1.0: the Download Center reads a previously generated report's bytes
  // back — nothing before this needed to re-read a file it had saved.
  read(storagePath: string): Promise<Buffer>;
}
