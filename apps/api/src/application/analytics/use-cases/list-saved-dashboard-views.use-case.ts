import type { DashboardType, SavedDashboardViewDto } from '@stratiq/shared';
import type { SavedDashboardViewRepository } from '../../../domain/repositories/saved-dashboard-view.repository.js';
import { toSavedDashboardViewDto } from '../mappers.js';

export class ListSavedDashboardViewsUseCase {
  constructor(private readonly savedViews: SavedDashboardViewRepository) {}

  async execute(
    organizationId: string,
    dashboardType?: DashboardType,
  ): Promise<SavedDashboardViewDto[]> {
    const views = await this.savedViews.listByOrganization(organizationId, dashboardType);
    return views.map(toSavedDashboardViewDto);
  }
}
