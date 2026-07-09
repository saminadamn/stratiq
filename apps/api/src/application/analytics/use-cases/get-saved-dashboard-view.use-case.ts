import type { SavedDashboardViewDto } from '@stratiq/shared';
import { SavedDashboardViewNotFoundError } from '../../../domain/errors/analytics-error.js';
import type { SavedDashboardViewRepository } from '../../../domain/repositories/saved-dashboard-view.repository.js';
import { toSavedDashboardViewDto } from '../mappers.js';

export class GetSavedDashboardViewUseCase {
  constructor(private readonly savedViews: SavedDashboardViewRepository) {}

  async execute(organizationId: string, viewId: string): Promise<SavedDashboardViewDto> {
    const view = await this.savedViews.findByOrganizationAndId(organizationId, viewId);
    if (!view) {
      throw new SavedDashboardViewNotFoundError();
    }
    return toSavedDashboardViewDto(view);
  }
}
