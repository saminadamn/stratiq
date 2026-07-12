import type {
  ChurnPredictionDto,
  CustomerSegmentationDto,
  DecisionRecommendationDto,
  ExecutiveDashboardDto,
  KpiSummaryDto,
  ProductRecommendationDto,
  SalesForecastDto,
} from '@stratiq/shared';
import type { PdfReportRequest } from '../../ports/report-generator.port.js';

const CRITICAL_COLOR = '#dc2626'; // red-600
const WARNING_COLOR = '#d97706'; // amber-600
const NEUTRAL_COLOR = '#64748b'; // slate-500

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: CRITICAL_COLOR,
  HIGH: WARNING_COLOR,
  MEDIUM: '#2563eb', // blue-600
  LOW: NEUTRAL_COLOR,
};

const TEAM_LABEL: Record<string, string> = {
  SALES: 'Sales',
  MARKETING: 'Marketing',
  OPERATIONS: 'Operations',
  CUSTOMER_SUCCESS: 'Customer Success',
  GENERAL: 'General',
};

const CONFIDENCE_LABEL: Record<string, string> = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };

// Mirrors DecisionIntelligencePanel.tsx's expectedImpactLabel() — priority
// already *is* the engine's impact ranking, kept as one deterministic
// derivation rather than a second field.
function expectedImpactLabel(priority: string): string {
  if (priority === 'CRITICAL' || priority === 'HIGH') return 'High';
  return priority === 'MEDIUM' ? 'Medium' : 'Low';
}

// Mirrors DecisionIntelligencePanel.tsx's timelineLabel().
function timelineLabel(actionPlan: Array<{ day: number; action: string }> | null): string {
  if (!actionPlan || actionPlan.length === 0) return '—';
  const nearestDay = Math.min(...actionPlan.map((item) => item.day));
  return `${nearestDay} Days`;
}

function severityBadge(
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | null,
): { label: string; color: string } | undefined {
  if (severity === 'CRITICAL') return { label: 'Critical', color: CRITICAL_COLOR };
  if (severity === 'WARNING') return { label: 'Warning', color: WARNING_COLOR };
  return undefined;
}

// Every method here composes DTOs already produced by earlier
// sprints/modules (the dashboard use cases, Predictive Intelligence,
// Decision Intelligence) into a PdfReportRequest — no new data-fetching or
// business logic lives here, only formatting/composition. This is what
// "integrate with the existing analytics engine rather than duplicate
// business logic" means for reporting specifically.
export class ReportBuilderService {
  buildExecutiveSummary(dashboard: ExecutiveDashboardDto): PdfReportRequest {
    return {
      title: 'Executive Summary',
      generatedAt: dashboard.generatedAt,
      sections: [
        {
          heading: 'Key Performance Indicators',
          rows: [
            { metric: 'Revenue', value: dashboard.kpis.revenue },
            { metric: 'Gross Profit', value: dashboard.kpis.grossProfit ?? 'N/A' },
            { metric: 'Total Orders', value: dashboard.kpis.totalOrders },
            { metric: 'Monthly Growth', value: dashboard.kpis.monthlyGrowthRate ?? 'N/A' },
            { metric: 'Active Customers', value: dashboard.kpis.activeCustomers },
          ],
        },
        {
          heading: 'Monthly Revenue Trend',
          rows: dashboard.monthlyRevenueTrend.map((point) => ({
            period: point.period,
            revenue: point.value,
          })),
          chart: {
            type: 'line',
            data: dashboard.monthlyRevenueTrend.map((point) => ({
              label: point.period,
              value: point.value,
            })),
          },
        },
        {
          heading: 'Revenue by Category',
          rows: dashboard.revenueByCategory.map((entry) => ({
            category: entry.label,
            revenue: entry.value,
          })),
          chart: {
            type: 'bar',
            data: dashboard.revenueByCategory
              .slice(0, 8)
              .map((entry) => ({ label: entry.label, value: entry.value })),
          },
        },
        {
          heading: 'Low Stock Alerts',
          rows: dashboard.lowStockAlerts.map((product) => ({
            product: product.productName,
            stockLevel: product.stockLevel,
          })),
        },
      ],
    };
  }

  buildKpiReport(kpis: KpiSummaryDto, generatedAt: string): PdfReportRequest {
    return {
      title: 'KPI Report',
      generatedAt,
      sections: [
        {
          heading: 'Summary',
          rows: [
            { metric: 'Revenue', value: kpis.revenue },
            { metric: 'Total Orders', value: kpis.totalOrders },
            { metric: 'Average Order Value', value: kpis.averageOrderValue },
            { metric: 'Gross Profit', value: kpis.grossProfit ?? 'N/A' },
            { metric: 'Profit Margin', value: kpis.profitMargin ?? 'N/A' },
            { metric: 'Repeat Purchase Rate', value: kpis.repeatPurchaseRate ?? 'N/A' },
            { metric: 'Active Customers', value: kpis.activeCustomers },
            { metric: 'Customer Lifetime Value', value: kpis.customerLifetimeValue ?? 'N/A' },
            { metric: 'Inventory Turnover', value: kpis.inventoryTurnover ?? 'N/A' },
          ],
        },
        {
          heading: 'Top Products',
          rows: kpis.topProducts.map((product) => ({
            product: product.productName,
            revenue: product.revenue,
            unitsSold: product.unitsSold,
          })),
          chart: {
            type: 'bar',
            data: kpis.topProducts.map((product) => ({
              label: product.productName,
              value: product.revenue,
            })),
          },
        },
      ],
    };
  }

  buildPredictionReport(
    generatedAt: string,
    churn: ChurnPredictionDto[],
    forecast: SalesForecastDto | null,
    segments: CustomerSegmentationDto | null,
    recommendations: ProductRecommendationDto[],
  ): PdfReportRequest {
    return {
      title: 'Prediction Report',
      generatedAt,
      sections: [
        {
          heading: 'Customer Churn Risk',
          rows: churn
            .slice()
            .sort((a, b) => b.churnProbability - a.churnProbability)
            .slice(0, 20)
            .map((prediction) => ({
              customer: prediction.customerName ?? prediction.customerId,
              churnProbability: `${Math.round(prediction.churnProbability * 100)}%`,
              confidence: `${Math.round(prediction.confidence * 100)}%`,
            })),
        },
        {
          heading: 'Sales Forecast',
          rows: forecast
            ? [...forecast.history, ...forecast.forecast].map((point) => ({
                period: point.period,
                value: point.value,
                type: 'isForecast' in point && point.isForecast ? 'Forecast' : 'Actual',
              }))
            : [],
          ...(forecast
            ? {
                chart: {
                  type: 'line' as const,
                  data: [...forecast.history, ...forecast.forecast].map((point) => ({
                    label: point.period,
                    value: point.value,
                  })),
                },
              }
            : {}),
        },
        {
          heading: 'Customer Segments',
          rows: segments
            ? segments.segments.map((segment) => ({
                segment: segment.label,
                customers: segment.customerCount,
                averageSpend: segment.averageSpend,
              }))
            : [],
        },
        {
          heading: 'Top Product Recommendations',
          rows: recommendations.slice(0, 20).map((recommendation) => ({
            customer: recommendation.customerId,
            product: recommendation.recommendedProductName ?? recommendation.recommendedProductId,
            score: recommendation.score,
          })),
        },
      ],
    };
  }

  buildRecommendationReport(
    generatedAt: string,
    decisions: DecisionRecommendationDto[],
  ): PdfReportRequest {
    const rootCauses = decisions.filter((item) => item.category === 'ROOT_CAUSE');
    const recommendations = decisions
      .filter((item) => item.category === 'RECOMMENDATION')
      .sort((a, b) => b.impactScore - a.impactScore);

    return {
      title: 'Recommendation Report',
      generatedAt,
      sections: [
        {
          heading: 'Executive Summary',
          paragraphs: buildExecutiveSummaryParagraphs(rootCauses, recommendations),
          rows: [],
        },
        {
          heading: 'Key Findings',
          cards: rootCauses.map((item) => ({
            title: item.title,
            badge: severityBadge(item.severity),
            body:
              item.finding && item.businessImpact
                ? `${item.finding} ${item.businessImpact}`
                : (item.rootCause ?? undefined),
            fields: item.confidence
              ? [{ label: 'Confidence', value: CONFIDENCE_LABEL[item.confidence] ?? item.confidence }]
              : undefined,
          })),
          rows: [],
        },
        {
          heading: 'Recommendations',
          cards: recommendations.map((item) => ({
            title: item.title,
            badge: { label: item.priority, color: PRIORITY_COLOR[item.priority] ?? NEUTRAL_COLOR },
            body: item.recommendationText ?? undefined,
            fields: [
              { label: 'Owner', value: item.team ? (TEAM_LABEL[item.team] ?? item.team) : '—' },
              { label: 'Expected Impact', value: expectedImpactLabel(item.priority) },
              { label: 'Timeline', value: timelineLabel(item.actionPlan) },
              {
                label: 'Confidence',
                value: item.confidence ? (CONFIDENCE_LABEL[item.confidence] ?? item.confidence) : '—',
              },
            ],
          })),
          rows: [],
          chart:
            recommendations.length > 0
              ? {
                  type: 'bar',
                  data: recommendations.map((item) => ({
                    label: item.title,
                    value: item.impactScore,
                  })),
                }
              : undefined,
        },
        {
          heading: 'Appendix: 30/60/90-Day Action Plan',
          rows: recommendations.flatMap(
            (item) =>
              item.actionPlan?.map((action) => ({
                recommendation: item.title,
                day: action.day,
                action: action.action,
              })) ?? [],
          ),
        },
      ],
    };
  }
}

// Deterministic, count-based — the same "no freeform generation" constraint
// as the rest of the Decision Intelligence Engine (see
// recommendation-engine.service.ts), not a written-up summary.
function buildExecutiveSummaryParagraphs(
  rootCauses: DecisionRecommendationDto[],
  recommendations: DecisionRecommendationDto[],
): string[] {
  const criticalCount = rootCauses.filter((item) => item.severity === 'CRITICAL').length;
  const warningCount = rootCauses.filter((item) => item.severity === 'WARNING').length;

  const findingsParagraph =
    rootCauses.length === 0
      ? 'No significant root causes were identified in this reporting period.'
      : `This report identifies ${rootCauses.length} root cause${rootCauses.length === 1 ? '' : 's'} behind recent performance changes` +
        (criticalCount > 0 || warningCount > 0
          ? `, including ${criticalCount} rated critical and ${warningCount} rated warning.`
          : '.');

  const topRecommendation = recommendations[0];
  const recommendationsParagraph =
    recommendations.length === 0
      ? 'No actions are recommended at this time.'
      : `${recommendations.length} action${recommendations.length === 1 ? ' is' : 's are'} recommended` +
        (topRecommendation ? `, led by "${topRecommendation.title}."` : '.');

  return [findingsParagraph, recommendationsParagraph];
}
