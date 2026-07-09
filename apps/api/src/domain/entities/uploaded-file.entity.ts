import type { SourceFileType } from '@stratiq/shared';

export interface UploadedFile {
  id: string;
  organizationId: string;
  originalFileName: string;
  storedFileName: string;
  storagePath: string;
  fileType: SourceFileType;
  mimeType: string;
  fileSizeBytes: number;
  checksumSha256: string;
  uploadedById: string;
  createdAt: Date;
}
