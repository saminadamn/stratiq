import type {
  CustomerDashboardDto,
  DashboardType,
  ExecutiveDashboardDto,
  InventoryDashboardDto,
  ProductDashboardDto,
} from '@stratiq/shared';

type AnyDashboard =
  ExecutiveDashboardDto | CustomerDashboardDto | ProductDashboardDto | InventoryDashboardDto;

// Each dashboard type has a different natural "primary table" for CSV/PDF
// export — the executive summary's KPIs, the customer dashboard's top
// customers, and so on. One function owns this mapping so CSV export and PDF
// export (which both need the same tabular data) can't drift from each other.
export function buildExportTable(
  dashboardType: DashboardType,
  dashboard: AnyDashboard,
): Array<Record<string, string | number>> {
  switch (dashboardType) {
    case 'EXECUTIVE': {
      const { kpis } = dashboard as ExecutiveDashboardDto;
      return [
        { metric: 'Revenue', value: kpis.revenue },
        { metric: 'Total Orders', value: kpis.totalOrders },
        { metric: 'Average Order Value', value: kpis.averageOrderValue },
        { metric: 'Gross Profit', value: kpis.grossProfit ?? '' },
        { metric: 'Profit Margin (%)', value: kpis.profitMargin ?? '' },
        { metric: 'Active Customers', value: kpis.activeCustomers },
        { metric: 'Customer Lifetime Value', value: kpis.customerLifetimeValue ?? '' },
        { metric: 'Repeat Purchase Rate (%)', value: kpis.repeatPurchaseRate ?? '' },
        { metric: 'Inventory Turnover', value: kpis.inventoryTurnover ?? '' },
        { metric: 'Monthly Growth Rate (%)', value: kpis.monthlyGrowthRate ?? '' },
      ];
    }
    case 'CUSTOMER': {
      const { topCustomers } = dashboard as CustomerDashboardDto;
      return topCustomers.map((customer) => ({
        customerId: customer.customerId,
        customerName: customer.customerName,
        totalSpent: customer.totalSpent,
        orderCount: customer.orderCount,
      }));
    }
    case 'PRODUCT': {
      const { bestSellers } = dashboard as ProductDashboardDto;
      return bestSellers.map((product) => ({
        productId: product.productId,
        productName: product.productName,
        revenue: product.revenue,
        profit: product.profit ?? '',
        unitsSold: product.unitsSold,
      }));
    }
    case 'INVENTORY': {
      const { stockLevels } = dashboard as InventoryDashboardDto;
      return stockLevels.map((level) => ({
        productId: level.productId,
        productName: level.productName,
        category: level.category ?? '',
        stockLevel: level.stockLevel,
        reorderLevel: level.reorderLevel ?? '',
        status: level.status,
      }));
    }
    default:
      return [];
  }
}
