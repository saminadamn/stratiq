import { createHash, randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FileStorage, SavedFile } from '../../application/ports/file-storage.port.js';

// Disk-based implementation for local/dev use. Swapping to S3/GCS later means
// writing one more class against the same FileStorage port — nothing calling
// it needs to change (see docs/ARCHITECTURE.md, Sprint 2 section).
export class LocalFileStorage implements FileStorage {
  constructor(private readonly rootDir: string) {}

  async save(input: {
    organizationId: string;
    originalFileName: string;
    buffer: Buffer;
  }): Promise<SavedFile> {
    // The stored name is always generated (never the user-supplied filename),
    // which rules out path traversal (e.g. "../../etc/passwd") and filename
    // collisions between uploads.
    const extension = path.extname(input.originalFileName).toLowerCase();
    const storedFileName = `${randomUUID()}${extension}`;
    const relativeDir = input.organizationId;
    const absoluteDir = path.join(this.rootDir, relativeDir);
    await mkdir(absoluteDir, { recursive: true });

    const storagePath = path.join(relativeDir, storedFileName);
    await writeFile(path.join(this.rootDir, storagePath), input.buffer);

    return {
      storedFileName,
      storagePath,
      fileSizeBytes: input.buffer.byteLength,
      checksumSha256: createHash('sha256').update(input.buffer).digest('hex'),
    };
  }

  async delete(storagePath: string): Promise<void> {
    // Deleting an already-missing file shouldn't fail the caller (e.g. a
    // dataset delete that races a manual cleanup) — it's a no-op either way.
    await unlink(path.join(this.rootDir, storagePath)).catch(() => undefined);
  }
}
