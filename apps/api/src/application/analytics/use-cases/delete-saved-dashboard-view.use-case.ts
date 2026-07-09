import { SavedDashboardViewNotFoundError } from '../../../domain/errors/analytics-error.js';
import type { SavedDashboardViewRepository } from '../../../domain/repositories/saved-dashboard-view.repository.js';

export class DeleteSavedDashboardViewUseCase {
  constructor(private readonly savedViews: SavedDashboardViewRepository) {}

  async execute(organizationId: string, viewId: string): Promise<void> {
    const existing = await this.savedViews.findByOrganizationAndId(organizationId, viewId);
    if (!existing) {
      throw new SavedDashboardViewNotFoundError();
    }
    await this.savedViews.delete(viewId);
  }
}
