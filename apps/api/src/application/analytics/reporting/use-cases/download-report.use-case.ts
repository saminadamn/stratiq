import {
  ReportNotFoundError,
  ReportNotReadyError,
} from '../../../../domain/errors/report-error.js';
import type { ReportRepository } from '../../../../domain/repositories/report.repository.js';
import type { FileStorage } from '../../../ports/file-storage.port.js';

export interface DownloadedReport {
  fileName: string;
  buffer: Buffer;
}

export class DownloadReportUseCase {
  constructor(
    private readonly reportRepository: ReportRepository,
    private readonly fileStorage: FileStorage,
  ) {}

  async execute(organizationId: string, reportId: string): Promise<DownloadedReport> {
    const report = await this.reportRepository.findByOrganizationAndId(organizationId, reportId);
    if (!report) {
      throw new ReportNotFoundError();
    }
    if (report.status !== 'COMPLETE' || !report.storagePath || !report.fileName) {
      throw new ReportNotReadyError(report.status as 'PENDING' | 'PROCESSING' | 'FAILED');
    }
    const buffer = await this.fileStorage.read(report.storagePath);
    return { fileName: report.fileName, buffer };
  }
}
