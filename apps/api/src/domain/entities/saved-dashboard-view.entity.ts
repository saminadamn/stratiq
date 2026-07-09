import type { AnalyticsFiltersDto, DashboardType } from '@stratiq/shared';

export interface SavedDashboardView {
  id: string;
  organizationId: string;
  createdById: string;
  name: string;
  dashboardType: DashboardType;
  filters: AnalyticsFiltersDto;
  createdAt: Date;
  updatedAt: Date;
}

export interface SavedDashboardViewWithCreator extends SavedDashboardView {
  createdBy: { id: string; name: string };
}
