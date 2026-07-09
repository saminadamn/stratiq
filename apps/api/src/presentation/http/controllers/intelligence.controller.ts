import type { Request, Response } from 'express';
import { z } from 'zod';
import { ALERT_STATUSES, BENCHMARK_PERIODS, RULE_COMPARATORS, ALERT_SEVERITIES } from '@stratiq/shared';
import type { GetMetricsRegistryUseCase } from '../../../application/analytics/intelligence/use-cases/get-metrics-registry.use-case.js';
import type { GetMetricDefinitionUseCase } from '../../../application/analytics/intelligence/use-cases/get-metric-definition.use-case.js';
import type { GetTrendUseCase } from '../../../application/analytics/intelligence/use-cases/get-trend.use-case.js';
import type { GetBenchmarkUseCase } from '../../../application/analytics/intelligence/use-cases/get-benchmark.use-case.js';
import type { GetInsightsUseCase } from '../../../application/analytics/intelligence/use-cases/get-insights.use-case.js';
import type { GetAlertsUseCase } from '../../../application/analytics/intelligence/use-cases/get-alerts.use-case.js';
import type { AcknowledgeAlertUseCase } from '../../../application/analytics/intelligence/use-cases/acknowledge-alert.use-case.js';
import type { ResolveAlertUseCase } from '../../../application/analytics/intelligence/use-cases/resolve-alert.use-case.js';
import type { ListBusinessRulesUseCase } from '../../../application/analytics/intelligence/use-cases/list-business-rules.use-case.js';
import type { CreateBusinessRuleUseCase } from '../../../application/analytics/intelligence/use-cases/create-business-rule.use-case.js';
import type { UpdateBusinessRuleUseCase } from '../../../application/analytics/intelligence/use-cases/update-business-rule.use-case.js';
import type { DeleteBusinessRuleUseCase } from '../../../application/analytics/intelligence/use-cases/delete-business-rule.use-case.js';
import { asyncHandler } from '../utils/async-handler.js';

const datasetQuerySchema = z.object({
  datasetId: z.string().optional(),
});

const trendQuerySchema = datasetQuerySchema;

const benchmarkQuerySchema = datasetQuerySchema.extend({
  period: z.enum(BENCHMARK_PERIODS).default('MONTH'),
});

// z.coerce.boolean() would treat the literal string "false" as truthy (it
// just runs Boolean(value)) — an explicit enum-to-boolean transform is the
// correct way to parse a boolean query flag.
const booleanQueryFlag = z
  .enum(['true', 'false'])
  .optional()
  .transform((value) => value === 'true');

const insightsQuerySchema = datasetQuerySchema.extend({
  limit: z.coerce.number().int().positive().max(200).optional(),
  forceRefresh: booleanQueryFlag,
});

const alertsQuerySchema = datasetQuerySchema.extend({
  status: z.enum(ALERT_STATUSES).optional(),
  forceRefresh: booleanQueryFlag,
});

const createRuleBodySchema = z.object({
  metricKey: z.string().min(1),
  name: z.string().min(1),
  comparator: z.enum(RULE_COMPARATORS),
  thresholdValue: z.number(),
  severity: z.enum(ALERT_SEVERITIES),
});

const updateRuleBodySchema = z.object({
  name: z.string().min(1).optional(),
  thresholdValue: z.number().optional(),
  severity: z.enum(ALERT_SEVERITIES).optional(),
  isActive: z.boolean().optional(),
});

export interface IntelligenceControllerDeps {
  getMetricsRegistry: GetMetricsRegistryUseCase;
  getMetricDefinition: GetMetricDefinitionUseCase;
  getTrend: GetTrendUseCase;
  getBenchmark: GetBenchmarkUseCase;
  getInsights: GetInsightsUseCase;
  getAlerts: GetAlertsUseCase;
  acknowledgeAlert: AcknowledgeAlertUseCase;
  resolveAlert: ResolveAlertUseCase;
  listBusinessRules: ListBusinessRulesUseCase;
  createBusinessRule: CreateBusinessRuleUseCase;
  updateBusinessRule: UpdateBusinessRuleUseCase;
  deleteBusinessRule: DeleteBusinessRuleUseCase;
}

export function createIntelligenceController(deps: IntelligenceControllerDeps) {
  return {
    getMetricsRegistry: asyncHandler(async (_req: Request, res: Response) => {
      const result = await deps.getMetricsRegistry.execute();
      res.status(200).json({ metrics: result });
    }),

    getMetricDefinition: asyncHandler(async (req: Request, res: Response) => {
      const result = await deps.getMetricDefinition.execute(req.params['metricKey'] as string);
      res.status(200).json(result);
    }),

    getTrend: asyncHandler(async (req: Request, res: Response) => {
      const query = trendQuerySchema.parse(req.query);
      const result = await deps.getTrend.execute(
        req.params['organizationId'] as string,
        req.params['metricKey'] as string,
        query.datasetId,
      );
      res.status(200).json(result);
    }),

    getBenchmark: asyncHandler(async (req: Request, res: Response) => {
      const query = benchmarkQuerySchema.parse(req.query);
      const result = await deps.getBenchmark.execute(
        req.params['organizationId'] as string,
        req.params['metricKey'] as string,
        query.period,
        query.datasetId,
      );
      res.status(200).json(result);
    }),

    getInsights: asyncHandler(async (req: Request, res: Response) => {
      const query = insightsQuerySchema.parse(req.query);
      const result = await deps.getInsights.execute(
        req.params['organizationId'] as string,
        query.datasetId,
        query.forceRefresh ?? false,
        query.limit ?? undefined,
      );
      res.status(200).json({ insights: result });
    }),

    getAlerts: asyncHandler(async (req: Request, res: Response) => {
      const query = alertsQuerySchema.parse(req.query);
      const result = await deps.getAlerts.execute(
        req.params['organizationId'] as string,
        query.status,
        query.datasetId,
        query.forceRefresh ?? false,
      );
      res.status(200).json({ alerts: result });
    }),

    acknowledgeAlert: asyncHandler(async (req: Request, res: Response) => {
      const result = await deps.acknowledgeAlert.execute(
        req.params['organizationId'] as string,
        req.params['alertId'] as string,
      );
      res.status(200).json(result);
    }),

    resolveAlert: asyncHandler(async (req: Request, res: Response) => {
      const result = await deps.resolveAlert.execute(
        req.params['organizationId'] as string,
        req.params['alertId'] as string,
      );
      res.status(200).json(result);
    }),

    listBusinessRules: asyncHandler(async (req: Request, res: Response) => {
      const result = await deps.listBusinessRules.execute(req.params['organizationId'] as string);
      res.status(200).json({ rules: result });
    }),

    createBusinessRule: asyncHandler(async (req: Request, res: Response) => {
      const body = createRuleBodySchema.parse(req.body);
      const result = await deps.createBusinessRule.execute(req.params['organizationId'] as string, body);
      res.status(201).json(result);
    }),

    updateBusinessRule: asyncHandler(async (req: Request, res: Response) => {
      const body = updateRuleBodySchema.parse(req.body);
      const result = await deps.updateBusinessRule.execute(
        req.params['organizationId'] as string,
        req.params['ruleId'] as string,
        body,
      );
      res.status(200).json(result);
    }),

    deleteBusinessRule: asyncHandler(async (req: Request, res: Response) => {
      await deps.deleteBusinessRule.execute(
        req.params['organizationId'] as string,
        req.params['ruleId'] as string,
      );
      res.status(204).send();
    }),
  };
}
