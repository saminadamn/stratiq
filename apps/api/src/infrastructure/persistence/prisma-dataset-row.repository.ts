import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  DatasetRowPage,
  DatasetRowRepository,
} from '../../domain/repositories/dataset-row.repository.js';

// Large uploads mean thousands of INSERT parameters in one statement — chunk
// them to stay well under Postgres's per-statement parameter ceiling.
const INSERT_CHUNK_SIZE = 1000;

export class PrismaDatasetRowRepository implements DatasetRowRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async insertMany(datasetVersionId: string, rows: Array<Record<string, unknown>>): Promise<void> {
    const data = rows.map((row, index) => ({
      datasetVersionId,
      rowIndex: index,
      data: row as unknown as Prisma.InputJsonValue,
    }));

    for (let offset = 0; offset < data.length; offset += INSERT_CHUNK_SIZE) {
      await this.prisma.datasetRow.createMany({
        data: data.slice(offset, offset + INSERT_CHUNK_SIZE),
      });
    }
  }

  async findPage(
    datasetVersionId: string,
    page: number,
    pageSize: number,
  ): Promise<DatasetRowPage> {
    const [rows, totalRows] = await Promise.all([
      this.prisma.datasetRow.findMany({
        where: { datasetVersionId },
        orderBy: { rowIndex: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.datasetRow.count({ where: { datasetVersionId } }),
    ]);

    return {
      rows: rows.map((row) => row.data as unknown as Record<string, unknown>),
      totalRows,
    };
  }

  async findAll(datasetVersionId: string): Promise<Array<Record<string, unknown>>> {
    const rows = await this.prisma.datasetRow.findMany({
      where: { datasetVersionId },
      orderBy: { rowIndex: 'asc' },
    });
    return rows.map((row) => row.data as unknown as Record<string, unknown>);
  }
}
