import type { Request, Response } from 'express';
import { z } from 'zod';
import { REPORT_TYPES } from '@stratiq/shared';
import type { DownloadReportUseCase } from '../../../application/analytics/reporting/use-cases/download-report.use-case.js';
import type { EnqueueReportUseCase } from '../../../application/analytics/reporting/use-cases/enqueue-report.use-case.js';
import type { ListReportsUseCase } from '../../../application/analytics/reporting/use-cases/list-reports.use-case.js';
import { asyncHandler } from '../utils/async-handler.js';

const generateReportBodySchema = z.object({
  type: z.enum(REPORT_TYPES),
  datasetId: z.string().optional(),
});

export interface ReportsControllerDeps {
  generateReport: EnqueueReportUseCase;
  listReports: ListReportsUseCase;
  downloadReport: DownloadReportUseCase;
}

export function createReportsController(deps: ReportsControllerDeps) {
  return {
    // 202: this only enqueues the job (see EnqueueReportUseCase) — the
    // report comes back PENDING, and the client polls GET /reports for
    // completion rather than waiting on this request.
    generateReport: asyncHandler(async (req: Request, res: Response) => {
      const body = generateReportBodySchema.parse(req.body);
      const result = await deps.generateReport.execute(
        req.params['organizationId'] as string,
        req.userId as string,
        body.type,
        body.datasetId,
      );
      res.status(202).json(result);
    }),

    listReports: asyncHandler(async (req: Request, res: Response) => {
      const result = await deps.listReports.execute(req.params['organizationId'] as string);
      res.status(200).json({ reports: result });
    }),

    downloadReport: asyncHandler(async (req: Request, res: Response) => {
      const result = await deps.downloadReport.execute(
        req.params['organizationId'] as string,
        req.params['reportId'] as string,
      );
      res
        .status(200)
        .setHeader('Content-Type', 'application/pdf')
        .setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`)
        .send(result.buffer);
    }),
  };
}
