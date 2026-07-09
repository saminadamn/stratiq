import type {
  CategoryValueDto,
  CohortRowDto,
  CustomerDashboardDto,
  CustomerSegment,
  CustomerSegmentBreakdownDto,
  PurchaseFrequencyBucketDto,
  TopCustomerDto,
} from '@stratiq/shared';
import type { AnalyticsColumns } from './column-detection.js';
import { calculateCustomerLifetimeValue } from './kpis/customer-lifetime-value.kpi.js';
import { calculateRepeatPurchaseRate } from './kpis/repeat-purchase-rate.kpi.js';
import {
  rowCustomerId,
  rowCustomerName,
  rowDate,
  rowOrderId,
  rowRegion,
  rowRevenue,
} from './row-metrics.js';
import { round2 } from './rounding.js';
import { monthKey } from './time-series.service.js';

type Row = Record<string, unknown>;

// Everything this service computes derives from one shared per-customer
// aggregate, built in a single pass over the rows — segments, top customers,
// the frequency histogram, and cohort analysis all read from this instead of
// each re-scanning the dataset with slightly different logic.
interface CustomerAggregate {
  customerId: string;
  customerName: string;
  region: string | null;
  orderKeys: Set<unknown>;
  months: Set<string>;
  totalSpent: number;
}

const MAX_COHORT_PERIODS = 12;
const TOP_CUSTOMERS_LIMIT = 10;

function buildCustomerAggregates(
  rows: Row[],
  columns: AnalyticsColumns,
): Map<string, CustomerAggregate> {
  const aggregates = new Map<string, CustomerAggregate>();

  for (const row of rows) {
    const customerId = rowCustomerId(row, columns);
    if (!customerId) {
      continue;
    }

    const aggregate = aggregates.get(customerId) ?? {
      customerId,
      customerName: rowCustomerName(row, columns) ?? customerId,
      region: rowRegion(row, columns),
      orderKeys: new Set<unknown>(),
      months: new Set<string>(),
      totalSpent: 0,
    };

    aggregate.orderKeys.add(columns.orderId ? rowOrderId(row, columns) : row);

    const date = rowDate(row, columns);
    if (date) {
      aggregate.months.add(monthKey(date));
    }

    const revenue = rowRevenue(row, columns);
    if (revenue !== null) {
      aggregate.totalSpent += revenue;
    }

    aggregates.set(customerId, aggregate);
  }

  return aggregates;
}

function segmentFor(orderCount: number): CustomerSegment {
  if (orderCount <= 1) {
    return 'NEW';
  }
  if (orderCount <= 4) {
    return 'RETURNING';
  }
  return 'LOYAL';
}

function addMonthsToKey(key: string, monthsToAdd: number): string {
  const [yearPart, monthPart] = key.split('-');
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1 + monthsToAdd;
  return monthKey(new Date(Date.UTC(year, monthIndex, 1)));
}

function computeCohortAnalysis(aggregates: Map<string, CustomerAggregate>): CohortRowDto[] {
  const customers = [...aggregates.values()].filter((customer) => customer.months.size > 0);
  if (customers.length === 0) {
    return [];
  }

  const cohorts = new Map<string, CustomerAggregate[]>();
  for (const customer of customers) {
    const cohortMonth = [...customer.months].sort()[0] as string;
    const cohortCustomers = cohorts.get(cohortMonth) ?? [];
    cohortCustomers.push(customer);
    cohorts.set(cohortMonth, cohortCustomers);
  }

  const allMonths = [...new Set(customers.flatMap((customer) => [...customer.months]))].sort();
  const latestMonth = allMonths[allMonths.length - 1] as string;

  return [...cohorts.keys()].sort().map((cohortMonth) => {
    const cohortCustomers = cohorts.get(cohortMonth) as CustomerAggregate[];
    const retainedCustomersByPeriod: number[] = [];

    for (let period = 0; period < MAX_COHORT_PERIODS; period += 1) {
      const targetMonth = addMonthsToKey(cohortMonth, period);
      if (targetMonth > latestMonth) {
        break;
      }
      retainedCustomersByPeriod.push(
        cohortCustomers.filter((customer) => customer.months.has(targetMonth)).length,
      );
    }

    return { cohortPeriod: cohortMonth, retainedCustomersByPeriod };
  });
}

function computeFrequencyHistogram(
  aggregates: Map<string, CustomerAggregate>,
): PurchaseFrequencyBucketDto[] {
  const buckets: Record<string, number> = { '1': 0, '2-3': 0, '4-6': 0, '7+': 0 };

  for (const customer of aggregates.values()) {
    const count = customer.orderKeys.size;
    if (count <= 1) {
      buckets['1'] = (buckets['1'] ?? 0) + 1;
    } else if (count <= 3) {
      buckets['2-3'] = (buckets['2-3'] ?? 0) + 1;
    } else if (count <= 6) {
      buckets['4-6'] = (buckets['4-6'] ?? 0) + 1;
    } else {
      buckets['7+'] = (buckets['7+'] ?? 0) + 1;
    }
  }

  return Object.entries(buckets).map(([bucket, customerCount]) => ({ bucket, customerCount }));
}

export type CustomerAnalyticsResult = Omit<
  CustomerDashboardDto,
  'generatedAt' | 'datasetId' | 'datasetVersionId'
>;

export class CustomerAnalyticsService {
  // Segment is derived from a customer's full order history, not a raw row
  // field, so it can't be filtered the way filters.ts handles
  // category/region/product — this computes segments once, then keeps only
  // rows belonging to matching customers.
  filterRowsBySegment(rows: Row[], columns: AnalyticsColumns, segment: CustomerSegment): Row[] {
    if (!columns.customerId) {
      return rows;
    }
    const aggregates = buildCustomerAggregates(rows, columns);
    const matchingCustomerIds = new Set(
      [...aggregates.values()]
        .filter((customer) => segmentFor(customer.orderKeys.size) === segment)
        .map((customer) => customer.customerId),
    );
    return rows.filter((row) => {
      const customerId = rowCustomerId(row, columns);
      return customerId !== null && matchingCustomerIds.has(customerId);
    });
  }

  build(rows: Row[], columns: AnalyticsColumns): CustomerAnalyticsResult {
    const aggregates = buildCustomerAggregates(rows, columns);
    const customers = [...aggregates.values()];

    let newCustomers = 0;
    let returningCustomers = 0;
    for (const customer of customers) {
      if (customer.orderKeys.size <= 1) {
        newCustomers += 1;
      } else {
        returningCustomers += 1;
      }
    }

    return {
      newCustomers,
      returningCustomers,
      retentionRate: this.computeRetentionRate(customers),
      averagePurchaseFrequency:
        customers.length === 0
          ? null
          : round2(
              customers.reduce((sum, customer) => sum + customer.orderKeys.size, 0) /
                customers.length,
            ),
      customerLifetimeValue: calculateCustomerLifetimeValue(rows, columns),
      repeatPurchaseRate: calculateRepeatPurchaseRate(rows, columns),
      topCustomers: this.getTopCustomers(customers),
      customerDistributionByRegion: this.getDistributionByRegion(customers),
      segmentBreakdown: this.getSegmentBreakdown(customers),
      cohortAnalysis: computeCohortAnalysis(aggregates),
      purchaseFrequencyHistogram: computeFrequencyHistogram(aggregates),
    };
  }

  // Month-over-month retention for the most recent transition present in the
  // data: of the customers active in the second-to-last month, what
  // percentage were still active in the last month.
  private computeRetentionRate(customers: CustomerAggregate[]): number | null {
    const allMonths = [...new Set(customers.flatMap((customer) => [...customer.months]))].sort();
    if (allMonths.length < 2) {
      return null;
    }
    const lastMonth = allMonths[allMonths.length - 1] as string;
    const previousMonth = allMonths[allMonths.length - 2] as string;

    const activeInPrevious = customers.filter((customer) => customer.months.has(previousMonth));
    if (activeInPrevious.length === 0) {
      return null;
    }
    const retained = activeInPrevious.filter((customer) => customer.months.has(lastMonth)).length;
    return round2((retained / activeInPrevious.length) * 100);
  }

  private getTopCustomers(customers: CustomerAggregate[]): TopCustomerDto[] {
    return customers
      .slice()
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, TOP_CUSTOMERS_LIMIT)
      .map((customer) => ({
        customerId: customer.customerId,
        customerName: customer.customerName,
        totalSpent: round2(customer.totalSpent),
        orderCount: customer.orderKeys.size,
      }));
  }

  private getDistributionByRegion(customers: CustomerAggregate[]): CategoryValueDto[] {
    const counts = new Map<string, number>();
    for (const customer of customers) {
      if (!customer.region) {
        continue;
      }
      counts.set(customer.region, (counts.get(customer.region) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }

  private getSegmentBreakdown(customers: CustomerAggregate[]): CustomerSegmentBreakdownDto[] {
    const counts: Record<CustomerSegment, number> = { NEW: 0, RETURNING: 0, LOYAL: 0 };
    for (const customer of customers) {
      const segment = segmentFor(customer.orderKeys.size);
      counts[segment] += 1;
    }
    return (Object.keys(counts) as CustomerSegment[]).map((segment) => ({
      segment,
      customerCount: counts[segment],
    }));
  }
}
