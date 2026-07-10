import type { ReportDto } from '@stratiq/shared';
import type { ReportRepository } from '../../../../domain/repositories/report.repository.js';

export class ListReportsUseCase {
  constructor(private readonly reportRepository: ReportRepository) {}

  async execute(organizationId: string): Promise<ReportDto[]> {
    const reports = await this.reportRepository.listByOrganization(organizationId);
    return reports.map((report) => ({
      id: report.id,
      type: report.type,
      fileName: report.fileName,
      generatedAt: report.generatedAt.toISOString(),
      generatedBy: { id: report.generatedById, name: report.generatedByName },
    }));
  }
}
