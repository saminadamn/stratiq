import { describe, expect, it, vi } from 'vitest';
import type { AlertRepository } from '../../../domain/repositories/alert.repository.js';
import type { BusinessRuleRepository } from '../../../domain/repositories/business-rule.repository.js';
import type { InsightRepository } from '../../../domain/repositories/insight.repository.js';
import type { MetricDefinitionRepository } from '../../../domain/repositories/metric-definition.repository.js';
import { columns } from '../test-fixtures.js';
import type { AnalyticsDatasetContext } from '../resolve-analytics-dataset.service.js';
import { GenerateIntelligenceService } from './generate-intelligence.service.js';
import type { GeneratedInsight, InsightEngineService } from './insight-engine.service.js';

function buildContext(): AnalyticsDatasetContext {
  return {
    datasetId: 'dataset-1',
    datasetVersionId: 'version-1',
    columns: columns({ orderDate: 'date', revenue: 'revenue' }),
    rows: [{ date: '2026-01-01', revenue: 100 }],
  };
}

const oneInsight: GeneratedInsight = {
  metricKey: 'revenue',
  title: 'Revenue is stable',
  narrative: 'Revenue was $100.',
  trend: 'STABLE',
  severity: 'INFO',
  currentValue: 100,
  previousValue: null,
  changePercent: null,
  triggeredRuleIds: [],
  outlierPeriods: [],
};

describe('GenerateIntelligenceService', () => {
  it('generates insights only once when ensureGenerated races for the same dataset version', async () => {
    // Simulates the Insights and Alerts panels both mounting at once and
    // calling ensureGenerated for the same dataset version before either
    // insight has been persisted — the race that previously double-generated
    // insights and alerts.
    let persistedCount = 0;
    const countByDatasetVersion = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return persistedCount;
    });
    const createInsight = vi.fn(async () => {
      persistedCount += 1;
      return {} as never;
    });

    const metricDefinitions: MetricDefinitionRepository = {
      upsertMany: vi.fn(),
      listAll: vi.fn().mockResolvedValue([
        {
          id: 'm1',
          key: 'revenue',
          name: 'Revenue',
          description: '',
          category: 'REVENUE',
          formula: '',
          unit: 'CURRENCY',
          owner: 'Finance',
          refreshPolicy: 'REALTIME',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
      findByKey: vi.fn(),
    };
    const businessRules: BusinessRuleRepository = {
      create: vi.fn(),
      createMany: vi.fn(),
      listByOrganization: vi.fn().mockResolvedValue([]),
      findByOrganizationAndId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      countByOrganization: vi.fn().mockResolvedValue(4),
    };
    const insights: InsightRepository = {
      create: createInsight,
      countByDatasetVersion,
      listByOrganization: vi.fn(),
    };
    const alerts: AlertRepository = {
      create: vi.fn(),
      listByOrganization: vi.fn(),
      findByOrganizationAndId: vi.fn(),
      updateStatus: vi.fn(),
    };
    const insightEngine: InsightEngineService = {
      generate: vi.fn().mockReturnValue([oneInsight]),
    } as unknown as InsightEngineService;

    const service = new GenerateIntelligenceService(
      metricDefinitions,
      businessRules,
      insights,
      alerts,
      insightEngine,
      { revenue: () => 100 },
    );

    const context = buildContext();
    await Promise.all([
      service.ensureGenerated('org-1', context, false),
      service.ensureGenerated('org-1', context, false),
    ]);

    expect(createInsight).toHaveBeenCalledTimes(1);
  });
});
