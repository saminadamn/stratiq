import type { Request, Response } from 'express';
import { z } from 'zod';
import { CLEANING_OPERATION_TYPES, type CleaningOperationType } from '@stratiq/shared';
import type { UploadDatasetUseCase } from '../../../application/datasets/use-cases/upload-dataset.use-case.js';
import type { ListDatasetsUseCase } from '../../../application/datasets/use-cases/list-datasets.use-case.js';
import type { GetDatasetUseCase } from '../../../application/datasets/use-cases/get-dataset.use-case.js';
import type { DeleteDatasetUseCase } from '../../../application/datasets/use-cases/delete-dataset.use-case.js';
import type { PreviewDatasetUseCase } from '../../../application/datasets/use-cases/preview-dataset.use-case.js';
import type { GetValidationReportUseCase } from '../../../application/datasets/use-cases/get-validation-report.use-case.js';
import type { GetDatasetHistoryUseCase } from '../../../application/datasets/use-cases/get-dataset-history.use-case.js';
import type { CleanDatasetUseCase } from '../../../application/datasets/use-cases/clean-dataset.use-case.js';
import { NoFileUploadedError } from '../../../domain/errors/dataset-error.js';
import { asyncHandler } from '../utils/async-handler.js';

const cleaningModeSchema = z.enum(['NONE', 'AUTOMATIC', 'MANUAL']);
const cleaningOperationSchema = z.enum(CLEANING_OPERATION_TYPES);

const baseUploadFields = {
  cleaningMode: cleaningModeSchema.default('NONE'),
  // Multipart form fields are strings — a comma-separated list rather than a
  // JSON array, parsed and validated below.
  operations: z.string().optional(),
};
const createDatasetUploadBodySchema = z.object({
  name: z.string().min(1, 'Dataset name is required.'),
  ...baseUploadFields,
});
const addVersionUploadBodySchema = z.object(baseUploadFields);

const cleanBodySchema = z.object({
  mode: z.enum(['AUTOMATIC', 'MANUAL']),
  operations: z.array(cleaningOperationSchema).optional(),
  sourceVersionId: z.string().optional(),
});

const previewQuerySchema = z.object({
  version: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(500).default(50),
});

const qualityQuerySchema = z.object({
  version: z.string().optional(),
});

function parseOperationsField(raw: string | undefined): CleaningOperationType[] | undefined {
  if (!raw) {
    return undefined;
  }
  const values = raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return z.array(cleaningOperationSchema).parse(values);
}

export interface DatasetControllerDeps {
  uploadDataset: UploadDatasetUseCase;
  listDatasets: ListDatasetsUseCase;
  getDataset: GetDatasetUseCase;
  deleteDataset: DeleteDatasetUseCase;
  previewDataset: PreviewDatasetUseCase;
  getValidationReport: GetValidationReportUseCase;
  getDatasetHistory: GetDatasetHistoryUseCase;
  cleanDataset: CleanDatasetUseCase;
}

export function createDatasetController(deps: DatasetControllerDeps) {
  return {
    upload: asyncHandler(async (req: Request, res: Response) => {
      if (!req.file) {
        throw new NoFileUploadedError();
      }
      const body = createDatasetUploadBodySchema.parse(req.body);
      const result = await deps.uploadDataset.execute({
        organizationId: req.params['organizationId'] as string,
        userId: req.userId as string,
        datasetName: body.name,
        originalFileName: req.file.originalname,
        mimeType: req.file.mimetype,
        buffer: req.file.buffer,
        cleaningMode: body.cleaningMode,
        requestedOperations: parseOperationsField(body.operations),
      });
      res.status(201).json(result);
    }),

    uploadVersion: asyncHandler(async (req: Request, res: Response) => {
      if (!req.file) {
        throw new NoFileUploadedError();
      }
      const body = addVersionUploadBodySchema.parse(req.body);
      const result = await deps.uploadDataset.execute({
        organizationId: req.params['organizationId'] as string,
        userId: req.userId as string,
        datasetId: req.params['datasetId'] as string,
        originalFileName: req.file.originalname,
        mimeType: req.file.mimetype,
        buffer: req.file.buffer,
        cleaningMode: body.cleaningMode,
        requestedOperations: parseOperationsField(body.operations),
      });
      res.status(201).json(result);
    }),

    list: asyncHandler(async (req: Request, res: Response) => {
      const datasets = await deps.listDatasets.execute(req.params['organizationId'] as string);
      res.status(200).json({ datasets });
    }),

    get: asyncHandler(async (req: Request, res: Response) => {
      const dataset = await deps.getDataset.execute(
        req.params['organizationId'] as string,
        req.params['datasetId'] as string,
      );
      res.status(200).json(dataset);
    }),

    remove: asyncHandler(async (req: Request, res: Response) => {
      await deps.deleteDataset.execute(
        req.params['organizationId'] as string,
        req.params['datasetId'] as string,
      );
      res.status(204).send();
    }),

    preview: asyncHandler(async (req: Request, res: Response) => {
      const query = previewQuerySchema.parse(req.query);
      const preview = await deps.previewDataset.execute({
        organizationId: req.params['organizationId'] as string,
        datasetId: req.params['datasetId'] as string,
        versionId: query.version,
        page: query.page,
        pageSize: query.pageSize,
      });
      res.status(200).json(preview);
    }),

    quality: asyncHandler(async (req: Request, res: Response) => {
      const query = qualityQuerySchema.parse(req.query);
      const report = await deps.getValidationReport.execute(
        req.params['organizationId'] as string,
        req.params['datasetId'] as string,
        query.version,
      );
      res.status(200).json(report);
    }),

    history: asyncHandler(async (req: Request, res: Response) => {
      const history = await deps.getDatasetHistory.execute(
        req.params['organizationId'] as string,
        req.params['datasetId'] as string,
      );
      res.status(200).json(history);
    }),

    clean: asyncHandler(async (req: Request, res: Response) => {
      const body = cleanBodySchema.parse(req.body);
      const result = await deps.cleanDataset.execute({
        organizationId: req.params['organizationId'] as string,
        datasetId: req.params['datasetId'] as string,
        userId: req.userId as string,
        mode: body.mode,
        operations: body.operations,
        sourceVersionId: body.sourceVersionId,
      });
      res.status(201).json(result);
    }),
  };
}
