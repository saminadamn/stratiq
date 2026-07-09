import type { AlertDto, BusinessRuleDto, InsightDto, MetricDefinitionDto } from '@stratiq/shared';
import type { Alert } from '../../../domain/entities/alert.entity.js';
import type { BusinessRule } from '../../../domain/entities/business-rule.entity.js';
import type { Insight } from '../../../domain/entities/insight.entity.js';
import type { MetricDefinition } from '../../../domain/entities/metric-definition.entity.js';

export function toMetricDefinitionDto(metric: MetricDefinition): MetricDefinitionDto {
  return {
    key: metric.key,
    name: metric.name,
    description: metric.description,
    category: metric.category,
    formula: metric.formula,
    unit: metric.unit,
    owner: metric.owner,
    refreshPolicy: metric.refreshPolicy,
  };
}

export function toInsightDto(insight: Insight): InsightDto {
  return {
    id: insight.id,
    metricKey: insight.metricKey,
    title: insight.title,
    narrative: insight.narrative,
    trend: insight.trend,
    severity: insight.severity,
    currentValue: insight.currentValue,
    previousValue: insight.previousValue,
    changePercent: insight.changePercent,
    createdAt: insight.createdAt.toISOString(),
  };
}

export function toAlertDto(alert: Alert): AlertDto {
  return {
    id: alert.id,
    metricKey: alert.metricKey,
    ruleId: alert.ruleId,
    severity: alert.severity,
    message: alert.message,
    currentValue: alert.currentValue,
    thresholdValue: alert.thresholdValue,
    status: alert.status,
    createdAt: alert.createdAt.toISOString(),
    resolvedAt: alert.resolvedAt ? alert.resolvedAt.toISOString() : null,
  };
}

export function toBusinessRuleDto(rule: BusinessRule): BusinessRuleDto {
  return {
    id: rule.id,
    metricKey: rule.metricKey,
    name: rule.name,
    comparator: rule.comparator,
    thresholdValue: rule.thresholdValue,
    severity: rule.severity,
    isActive: rule.isActive,
    isDefault: rule.isDefault,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}
