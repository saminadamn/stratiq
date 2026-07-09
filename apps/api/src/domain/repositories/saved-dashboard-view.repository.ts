import type { AnalyticsFiltersDto, DashboardType } from '@stratiq/shared';
import type { SavedDashboardViewWithCreator } from '../entities/saved-dashboard-view.entity.js';

export interface CreateSavedDashboardViewInput {
  organizationId: string;
  createdById: string;
  name: string;
  dashboardType: DashboardType;
  filters: AnalyticsFiltersDto;
}

export interface UpdateSavedDashboardViewInput {
  name?: string | undefined;
  filters?: AnalyticsFiltersDto | undefined;
}

export interface SavedDashboardViewRepository {
  create(input: CreateSavedDashboardViewInput): Promise<SavedDashboardViewWithCreator>;
  findByOrganizationAndId(
    organizationId: string,
    id: string,
  ): Promise<SavedDashboardViewWithCreator | null>;
  listByOrganization(
    organizationId: string,
    dashboardType?: DashboardType,
  ): Promise<SavedDashboardViewWithCreator[]>;
  update(id: string, input: UpdateSavedDashboardViewInput): Promise<SavedDashboardViewWithCreator>;
  delete(id: string): Promise<void>;
}
