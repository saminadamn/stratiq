import type { SavedDashboardViewDto, UpdateSavedDashboardViewRequestDto } from '@stratiq/shared';
import { SavedDashboardViewNotFoundError } from '../../../domain/errors/analytics-error.js';
import type { SavedDashboardViewRepository } from '../../../domain/repositories/saved-dashboard-view.repository.js';
import { toSavedDashboardViewDto } from '../mappers.js';

export class UpdateSavedDashboardViewUseCase {
  constructor(private readonly savedViews: SavedDashboardViewRepository) {}

  async execute(
    organizationId: string,
    viewId: string,
    input: UpdateSavedDashboardViewRequestDto,
  ): Promise<SavedDashboardViewDto> {
    const existing = await this.savedViews.findByOrganizationAndId(organizationId, viewId);
    if (!existing) {
      throw new SavedDashboardViewNotFoundError();
    }
    const updated = await this.savedViews.update(viewId, input);
    return toSavedDashboardViewDto(updated);
  }
}
