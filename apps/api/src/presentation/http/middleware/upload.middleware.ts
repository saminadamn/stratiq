import multer from 'multer';
import type { Request } from 'express';
import { detectFileType } from '../../../application/datasets/detect-file-type.js';

// Memory storage, not disk: the buffer is handed to the FileStorage port
// (application/ports/file-storage.port.ts) which decides where bytes
// actually land — multer shouldn't know or care that it's local disk today.
export function createUploadMiddleware(maxUploadSizeBytes: number): multer.Multer {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxUploadSizeBytes },
    fileFilter: (_req: Request, file, callback) => {
      try {
        detectFileType(file.originalname, file.mimetype);
        callback(null, true);
      } catch (err) {
        callback(err instanceof Error ? err : new Error('Unsupported file type.'));
      }
    },
  });
}
