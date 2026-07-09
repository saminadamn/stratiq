import type { PrismaClient } from '@prisma/client';
import type { UploadedFile } from '../../domain/entities/uploaded-file.entity.js';
import type {
  CreateUploadedFileInput,
  UploadedFileRepository,
} from '../../domain/repositories/uploaded-file.repository.js';

export class PrismaUploadedFileRepository implements UploadedFileRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateUploadedFileInput): Promise<UploadedFile> {
    return this.prisma.uploadedFile.create({ data: input });
  }

  async findById(id: string): Promise<UploadedFile | null> {
    return this.prisma.uploadedFile.findUnique({ where: { id } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.uploadedFile.delete({ where: { id } });
  }
}
