import type { SavedDashboardViewDto } from '@stratiq/shared';
import type { SavedDashboardViewWithCreator } from '../../domain/entities/saved-dashboard-view.entity.js';

export function toSavedDashboardViewDto(
  view: SavedDashboardViewWithCreator,
): SavedDashboardViewDto {
  return {
    id: view.id,
    name: view.name,
    dashboardType: view.dashboardType,
    filters: view.filters,
    createdAt: view.createdAt.toISOString(),
    updatedAt: view.updatedAt.toISOString(),
    createdBy: view.createdBy,
  };
}
