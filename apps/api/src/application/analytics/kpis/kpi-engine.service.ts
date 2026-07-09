import type { AnalyticsColumns } from '../column-detection.js';
import { calculateActiveCustomers } from './active-customers.kpi.js';
import { calculateAverageOrderValue } from './average-order-value.kpi.js';
import { calculateCustomerLifetimeValue } from './customer-lifetime-value.kpi.js';
import { calculateGrossProfit } from './gross-profit.kpi.js';
import { calculateMonthlyGrowthRate } from './monthly-growth-rate.kpi.js';
import { calculateTotalOrders } from './orders.kpi.js';
import { calculateProfitMargin } from './profit-margin.kpi.js';
import { calculateRepeatPurchaseRate } from './repeat-purchase-rate.kpi.js';
import { calculateRevenue } from './revenue.kpi.js';

export interface PureKpiSummary {
  revenue: number;
  totalOrders: number;
  averageOrderValue: number;
  grossProfit: number | null;
  profitMargin: number | null;
  repeatPurchaseRate: number | null;
  activeCustomers: number;
  customerLifetimeValue: number | null;
  monthlyGrowthRate: number | null;
}

// Runs every KPI in kpi-registry.ts over the same (rows, columns) input
// once. topProducts/inventoryTurnover are deliberately not here — see
// kpi-registry.ts for why those are merged in by GetKpiSummaryUseCase instead.
export class KpiEngineService {
  computeSummary(rows: Array<Record<string, unknown>>, columns: AnalyticsColumns): PureKpiSummary {
    return {
      revenue: calculateRevenue(rows, columns),
      totalOrders: calculateTotalOrders(rows, columns),
      averageOrderValue: calculateAverageOrderValue(rows, columns),
      grossProfit: calculateGrossProfit(rows, columns),
      profitMargin: calculateProfitMargin(rows, columns),
      repeatPurchaseRate: calculateRepeatPurchaseRate(rows, columns),
      activeCustomers: calculateActiveCustomers(rows, columns),
      customerLifetimeValue: calculateCustomerLifetimeValue(rows, columns),
      monthlyGrowthRate: calculateMonthlyGrowthRate(rows, columns),
    };
  }
}
