import { describe, expect, it, vi } from 'vitest';
import type { ReportRepository } from '../../../domain/repositories/report.repository.js';
import type { FileStorage } from '../../ports/file-storage.port.js';
import type { ReportGenerator } from '../../ports/report-generator.port.js';
import type { GetExecutiveDashboardUseCase } from '../use-cases/get-executive-dashboard.use-case.js';
import { ProcessReportJobService } from './process-report-job.service.js';

function buildDeps() {
  const reportRepository: ReportRepository = {
    create: vi.fn(),
    updateStatus: vi.fn().mockResolvedValue({}),
    listByOrganization: vi.fn(),
    findByOrganizationAndId: vi.fn(),
  };
  const reportGenerator: ReportGenerator = {
    generatePdf: vi.fn().mockResolvedValue(Buffer.from('pdf')),
  };
  const fileStorage: FileStorage = {
    save: vi.fn().mockResolvedValue({ storagePath: '/org-1/report.pdf' }),
    read: vi.fn(),
    delete: vi.fn(),
  };
  const getExecutiveDashboard = {
    execute: vi.fn().mockResolvedValue({
      kpis: {},
      monthlyRevenueTrend: [],
      ordersOverTime: [],
      revenueByCategory: [],
      revenueByRegion: [],
      topProduct: null,
      inventoryStatus: null,
      lowStockAlerts: [],
      generatedAt: '2024-02-01T00:00:00.000Z',
      datasetId: 'dataset-1',
      datasetVersionId: 'version-1',
    }),
  } as unknown as GetExecutiveDashboardUseCase;

  return { reportRepository, reportGenerator, fileStorage, getExecutiveDashboard };
}

function buildService(deps: ReturnType<typeof buildDeps>): ProcessReportJobService {
  const unused = { execute: vi.fn() };
  return new ProcessReportJobService(
    deps.getExecutiveDashboard,
    unused as never,
    unused as never,
    unused as never,
    unused as never,
    unused as never,
    unused as never,
    deps.reportGenerator,
    deps.fileStorage,
    deps.reportRepository,
  );
}

describe('ProcessReportJobService', () => {
  it('marks the report PROCESSING then COMPLETE with the saved file details', async () => {
    const deps = buildDeps();
    const service = buildService(deps);

    await service.process({
      reportId: 'report-1',
      organizationId: 'org-1',
      generatedById: 'user-1',
      type: 'EXECUTIVE_SUMMARY',
    });

    const calls = (deps.reportRepository.updateStatus as ReturnType<typeof vi.fn>).mock.calls;
    const [processingCall, completeCall] = calls;
    expect(processingCall).toEqual(['report-1', { status: 'PROCESSING' }]);
    expect(completeCall?.[0]).toBe('report-1');
    expect(completeCall?.[1]).toMatchObject({
      status: 'COMPLETE',
      storagePath: '/org-1/report.pdf',
    });
    expect(completeCall?.[1].fileName).toMatch(/^executive-summary-report-.*\.pdf$/);
  });

  it('marks the report FAILED with the error message and rethrows when generation fails', async () => {
    const deps = buildDeps();
    (deps.reportGenerator.generatePdf as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('PDF engine crashed'),
    );
    const service = buildService(deps);

    await expect(
      service.process({
        reportId: 'report-1',
        organizationId: 'org-1',
        generatedById: 'user-1',
        type: 'EXECUTIVE_SUMMARY',
      }),
    ).rejects.toThrow('PDF engine crashed');

    const calls = (deps.reportRepository.updateStatus as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[1]).toEqual([
      'report-1',
      expect.objectContaining({ status: 'FAILED', errorMessage: 'PDF engine crashed' }),
    ]);
  });
});
