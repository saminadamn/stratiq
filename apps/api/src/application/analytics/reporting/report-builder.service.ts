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
            data: dashboard.monthlyRevenueTrend.map((point) => ({ label: point.period, value: point.value })),
          },
        },
        {
          heading: 'Revenue by Category',
          rows: dashboard.revenueByCategory.map((entry) => ({ category: entry.label, revenue: entry.value })),
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
            data: kpis.topProducts.map((product) => ({ label: product.productName, value: product.revenue })),
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

  buildRecommendationReport(generatedAt: string, decisions: DecisionRecommendationDto[]): PdfReportRequest {
    const rootCauses = decisions.filter((item) => item.category === 'ROOT_CAUSE');
    const recommendations = decisions.filter((item) => item.category === 'RECOMMENDATION');

    return {
      title: 'Recommendation Report',
      generatedAt,
      sections: [
        {
          heading: 'Root Causes',
          rows: rootCauses.map((item) => ({ title: item.title, explanation: item.rootCause ?? '' })),
        },
        {
          heading: 'Recommendations',
          rows: recommendations.map((item) => ({
            title: item.title,
            priority: item.priority,
            roiEstimate: item.roiEstimate ?? 'N/A',
            impactScore: item.impactScore,
          })),
          chart:
            recommendations.length > 0
              ? {
                  type: 'bar',
                  data: recommendations.map((item) => ({ label: item.title, value: item.impactScore })),
                }
              : undefined,
        },
        {
          heading: '30/60/90-Day Action Plan',
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
