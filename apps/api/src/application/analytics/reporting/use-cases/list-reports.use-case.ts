import type { ReportDto } from '@stratiq/shared';
import type { ReportRepository } from '../../../../domain/repositories/report.repository.js';

export class ListReportsUseCase {
  constructor(private readonly reportRepository: ReportRepository) {}

  async execute(organizationId: string): Promise<ReportDto[]> {
    const reports = await this.reportRepository.listByOrganization(organizationId);
    return reports.map((report) => ({
      id: report.id,
      type: report.type,
      status: report.status,
      fileName: report.fileName,
      errorMessage: report.errorMessage,
      generatedAt: report.generatedAt.toISOString(),
      generatedBy: { id: report.generatedById, name: report.generatedByName },
    }));
  }
}
