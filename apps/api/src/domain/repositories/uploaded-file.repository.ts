import type { SourceFileType } from '@stratiq/shared';
import type { UploadedFile } from '../entities/uploaded-file.entity.js';

export interface CreateUploadedFileInput {
  organizationId: string;
  originalFileName: string;
  storedFileName: string;
  storagePath: string;
  fileType: SourceFileType;
  mimeType: string;
  fileSizeBytes: number;
  checksumSha256: string;
  uploadedById: string;
}

export interface UploadedFileRepository {
  create(input: CreateUploadedFileInput): Promise<UploadedFile>;
  findById(id: string): Promise<UploadedFile | null>;
  delete(id: string): Promise<void>;
}
