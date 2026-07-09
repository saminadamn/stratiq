import type { CreateSavedDashboardViewRequestDto, SavedDashboardViewDto } from '@stratiq/shared';
import type { SavedDashboardViewRepository } from '../../../domain/repositories/saved-dashboard-view.repository.js';
import { toSavedDashboardViewDto } from '../mappers.js';

export interface CreateSavedDashboardViewInput extends CreateSavedDashboardViewRequestDto {
  organizationId: string;
  userId: string;
}

export class CreateSavedDashboardViewUseCase {
  constructor(private readonly savedViews: SavedDashboardViewRepository) {}

  async execute(input: CreateSavedDashboardViewInput): Promise<SavedDashboardViewDto> {
    const view = await this.savedViews.create({
      organizationId: input.organizationId,
      createdById: input.userId,
      name: input.name,
      dashboardType: input.dashboardType,
      filters: input.filters,
    });
    return toSavedDashboardViewDto(view);
  }
}
