import { describe, expect, it } from 'vitest';
import type {
  ChurnPredictionDto,
  DecisionRecommendationDto,
  ExecutiveDashboardDto,
  KpiSummaryDto,
} from '@stratiq/shared';
import { ReportBuilderService } from './report-builder.service.js';

const builder = new ReportBuilderService();

function executiveDashboard(): ExecutiveDashboardDto {
  return {
    kpis: {
      revenue: 1000,
      totalOrders: 10,
      averageOrderValue: 100,
      grossProfit: 400,
      profitMargin: 40,
      repeatPurchaseRate: 20,
      activeCustomers: 5,
      customerLifetimeValue: 200,
      inventoryTurnover: 2,
      monthlyGrowthRate: -10,
      topProducts: [],
    },
    monthlyRevenueTrend: [
      { period: '2024-01', value: 1000 },
      { period: '2024-02', value: 900 },
    ],
    ordersOverTime: [],
    revenueByCategory: [{ label: 'Widgets', value: 800 }],
    revenueByRegion: [],
    topProduct: null,
    inventoryStatus: null,
    lowStockAlerts: [{ productId: 'P1', productName: 'Widget', stockLevel: 2, reorderLevel: 10 }],
    generatedAt: '2024-02-01T00:00:00.000Z',
    datasetId: 'dataset-1',
    datasetVersionId: 'version-1',
  };
}

function kpiSummary(): KpiSummaryDto {
  return {
    revenue: 1000,
    totalOrders: 10,
    averageOrderValue: 100,
    grossProfit: 400,
    profitMargin: 40,
    repeatPurchaseRate: 20,
    activeCustomers: 5,
    customerLifetimeValue: 200,
    inventoryTurnover: 2,
    monthlyGrowthRate: -10,
    topProducts: [{ productId: 'P1', productName: 'Widget', revenue: 500, unitsSold: 10 }],
  };
}

describe('ReportBuilderService', () => {
  it('builds an executive summary with a revenue trend chart and low-stock section', () => {
    const request = builder.buildExecutiveSummary(executiveDashboard());
    expect(request.title).toBe('Executive Summary');

    const trendSection = request.sections.find((s) => s.heading === 'Monthly Revenue Trend');
    expect(trendSection?.chart?.type).toBe('line');
    expect(trendSection?.chart?.data).toHaveLength(2);

    const lowStockSection = request.sections.find((s) => s.heading === 'Low Stock Alerts');
    expect(lowStockSection?.rows).toEqual([{ product: 'Widget', stockLevel: 2 }]);
  });

  it('builds a KPI report with a top-products bar chart', () => {
    const request = builder.buildKpiReport(kpiSummary(), '2024-02-01T00:00:00.000Z');
    const topProductsSection = request.sections.find((s) => s.heading === 'Top Products');
    expect(topProductsSection?.chart?.type).toBe('bar');
    expect(topProductsSection?.chart?.data).toEqual([{ label: 'Widget', value: 500 }]);
  });

  it('builds a prediction report that handles a null forecast gracefully', () => {
    const churn: ChurnPredictionDto[] = [
      {
        customerId: 'C1',
        customerName: 'Alice',
        churnProbability: 0.9,
        confidence: 0.8,
        explanation: { method: 'x', topFeatures: [] },
      },
    ];
    const request = builder.buildPredictionReport(
      '2024-02-01T00:00:00.000Z',
      churn,
      null,
      null,
      [],
    );

    const forecastSection = request.sections.find((s) => s.heading === 'Sales Forecast');
    expect(forecastSection?.rows).toEqual([]);
    expect(forecastSection?.chart).toBeUndefined();

    const churnSection = request.sections.find((s) => s.heading === 'Customer Churn Risk');
    expect(churnSection?.rows[0]).toEqual({
      customer: 'Alice',
      churnProbability: '90%',
      confidence: '80%',
    });
  });

  it('builds a recommendation report splitting root causes from recommendations and flattening action plans', () => {
    const decisions: DecisionRecommendationDto[] = [
      {
        id: '1',
        category: 'ROOT_CAUSE',
        title: 'Why Revenue declined',
        rootCause: 'Orders dropped.',
        recommendationText: null,
        roiEstimate: null,
        impactScore: 90,
        priority: 'CRITICAL',
        actionPlan: null,
        createdAt: '2024-02-01T00:00:00.000Z',
        finding: null,
        businessImpact: null,
        confidence: null,
        severity: null,
        changePercent: null,
        metricKey: 'revenue',
        driverMetricKey: 'totalOrders',
        team: null,
      },
      {
        id: '2',
        category: 'RECOMMENDATION',
        title: 'Retain at-risk customers',
        rootCause: null,
        recommendationText: 'Launch a retention campaign.',
        roiEstimate: 300,
        impactScore: 70,
        priority: 'HIGH',
        actionPlan: [{ day: 30, action: 'Reach out directly.' }],
        createdAt: '2024-02-01T00:00:00.000Z',
        finding: null,
        businessImpact: null,
        confidence: null,
        severity: null,
        changePercent: null,
        metricKey: null,
        driverMetricKey: null,
        team: 'CUSTOMER_SUCCESS',
      },
    ];

    const request = builder.buildRecommendationReport('2024-02-01T00:00:00.000Z', decisions);

    const findingsSection = request.sections.find((s) => s.heading === 'Key Findings');
    expect(findingsSection?.cards).toEqual([
      {
        title: 'Why Revenue declined',
        badge: undefined,
        body: 'Orders dropped.',
        fields: undefined,
      },
    ]);
  });

  it('prefers finding+businessImpact over the raw rootCause text when both are present', () => {
    const decisions: DecisionRecommendationDto[] = [
      {
        id: '1',
        category: 'ROOT_CAUSE',
        title: 'Why Revenue declined',
        rootCause: 'Revenue decreased 60% to $400. Revenue decline warning: threshold breached.',
        recommendationText: null,
        roiEstimate: null,
        impactScore: 90,
        priority: 'CRITICAL',
        actionPlan: null,
        createdAt: '2024-02-01T00:00:00.000Z',
        finding: 'Revenue declined by 60.0%, driven primarily by Total Orders (-50.0%).',
        businessImpact: 'This reduces cash flow and pressures the ability to fund operations.',
        confidence: 'HIGH',
        severity: 'CRITICAL',
        changePercent: -60,
        metricKey: 'revenue',
        driverMetricKey: 'totalOrders',
        team: null,
      },
    ];

    const request = builder.buildRecommendationReport('2024-02-01T00:00:00.000Z', decisions);
    const findingsSection = request.sections.find((s) => s.heading === 'Key Findings');
    expect(findingsSection?.cards).toEqual([
      {
        title: 'Why Revenue declined',
        badge: { label: 'Critical', color: '#dc2626' },
        body: 'Revenue declined by 60.0%, driven primarily by Total Orders (-50.0%). This reduces cash flow and pressures the ability to fund operations.',
        fields: [{ label: 'Confidence', value: 'High' }],
      },
    ]);
  });

  it('still builds the Recommendations and Action Plan sections alongside Root Causes', () => {
    const decisions: DecisionRecommendationDto[] = [
      {
        id: '1',
        category: 'ROOT_CAUSE',
        title: 'Why Revenue declined',
        rootCause: 'Orders dropped.',
        recommendationText: null,
        roiEstimate: null,
        impactScore: 90,
        priority: 'CRITICAL',
        actionPlan: null,
        createdAt: '2024-02-01T00:00:00.000Z',
        finding: null,
        businessImpact: null,
        confidence: null,
        severity: null,
        changePercent: null,
        metricKey: 'revenue',
        driverMetricKey: 'totalOrders',
        team: null,
      },
      {
        id: '2',
        category: 'RECOMMENDATION',
        title: 'Retain at-risk customers',
        rootCause: null,
        recommendationText: 'Launch a retention campaign.',
        roiEstimate: 300,
        impactScore: 70,
        priority: 'HIGH',
        actionPlan: [{ day: 30, action: 'Reach out directly.' }],
        createdAt: '2024-02-01T00:00:00.000Z',
        finding: null,
        businessImpact: null,
        confidence: null,
        severity: null,
        changePercent: null,
        metricKey: null,
        driverMetricKey: null,
        team: 'CUSTOMER_SUCCESS',
      },
    ];

    const request = builder.buildRecommendationReport('2024-02-01T00:00:00.000Z', decisions);

    const recommendationSection = request.sections.find((s) => s.heading === 'Recommendations');
    expect(recommendationSection?.cards).toEqual([
      {
        title: 'Retain at-risk customers',
        badge: { label: 'HIGH', color: '#d97706' },
        body: 'Launch a retention campaign.',
        fields: [
          { label: 'Owner', value: 'Customer Success' },
          { label: 'Expected Impact', value: 'High' },
          { label: 'Timeline', value: '30 Days' },
          { label: 'Confidence', value: '—' },
        ],
      },
    ]);
    expect(recommendationSection?.chart?.data).toEqual([
      { label: 'Retain at-risk customers', value: 70 },
    ]);

    const actionPlanSection = request.sections.find(
      (s) => s.heading === 'Appendix: 30/60/90-Day Action Plan',
    );
    expect(actionPlanSection?.rows).toEqual([
      { recommendation: 'Retain at-risk customers', day: 30, action: 'Reach out directly.' },
    ]);
  });

  it('summarizes root causes and recommendations into deterministic executive-summary paragraphs', () => {
    const decisions: DecisionRecommendationDto[] = [
      {
        id: '1',
        category: 'ROOT_CAUSE',
        title: 'Why Revenue declined',
        rootCause: 'Orders dropped.',
        recommendationText: null,
        roiEstimate: null,
        impactScore: 90,
        priority: 'CRITICAL',
        actionPlan: null,
        createdAt: '2024-02-01T00:00:00.000Z',
        finding: null,
        businessImpact: null,
        confidence: null,
        severity: 'CRITICAL',
        changePercent: null,
        metricKey: 'revenue',
        driverMetricKey: 'totalOrders',
        team: null,
      },
      {
        id: '2',
        category: 'RECOMMENDATION',
        title: 'Retain at-risk customers',
        rootCause: null,
        recommendationText: 'Launch a retention campaign.',
        roiEstimate: 300,
        impactScore: 70,
        priority: 'HIGH',
        actionPlan: null,
        createdAt: '2024-02-01T00:00:00.000Z',
        finding: null,
        businessImpact: null,
        confidence: null,
        severity: null,
        changePercent: null,
        metricKey: null,
        driverMetricKey: null,
        team: 'CUSTOMER_SUCCESS',
      },
    ];

    const request = builder.buildRecommendationReport('2024-02-01T00:00:00.000Z', decisions);
    const summarySection = request.sections.find((s) => s.heading === 'Executive Summary');
    expect(summarySection?.paragraphs).toEqual([
      'This report identifies 1 root cause behind recent performance changes, including 1 rated critical and 0 rated warning.',
      '1 action is recommended, led by "Retain at-risk customers."',
    ]);
  });

  it('summarizes an all-clear dataset without a false critical/warning count', () => {
    const request = builder.buildRecommendationReport('2024-02-01T00:00:00.000Z', []);
    const summarySection = request.sections.find((s) => s.heading === 'Executive Summary');
    expect(summarySection?.paragraphs).toEqual([
      'No significant root causes were identified in this reporting period.',
      'No actions are recommended at this time.',
    ]);
  });
});
