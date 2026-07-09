import type { ColumnSchema } from '../../../domain/entities/column-schema.entity.js';
import { detectColumns } from './column-detection.js';
import {
  computeAverageOrderValue,
  computeCustomerLifetimeValue,
  computeMonthlyRevenue,
  computeProfitMargin,
  computeQuarterlyGrowth,
  computeRepeatPurchaseRate,
  computeTotalRevenue,
  type ComputedFeature,
} from './metrics.js';

// Each calculator independently decides whether it has the columns it needs
// (via detectColumns) and returns null otherwise — this service is just the
// list + the filter, so adding a metric never touches the others.
const CALCULATORS = [
  computeTotalRevenue,
  computeAverageOrderValue,
  computeCustomerLifetimeValue,
  computeRepeatPurchaseRate,
  computeProfitMargin,
  computeMonthlyRevenue,
  computeQuarterlyGrowth,
];

export class FeatureEngineeringService {
  compute(rows: Array<Record<string, unknown>>, schema: ColumnSchema[]): ComputedFeature[] {
    const detected = detectColumns(schema);
    return CALCULATORS.map((calculate) => calculate(rows, detected)).filter(
      (feature): feature is ComputedFeature => feature !== null,
    );
  }
}
