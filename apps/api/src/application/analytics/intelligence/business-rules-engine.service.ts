import type { AlertSeverity } from '@stratiq/shared';
import type { BusinessRule } from '../../../domain/entities/business-rule.entity.js';

export interface RuleEvaluationInput {
  currentValue: number;
  changePercent: number | null;
}

export interface TriggeredRule {
  ruleId: string;
  ruleName: string;
  metricKey: string;
  severity: AlertSeverity;
  message: string;
  thresholdValue: number;
  actualValue: number;
}

const PERCENT_CHANGE_COMPARATORS = new Set(['PERCENT_CHANGE_ABOVE', 'PERCENT_CHANGE_BELOW']);

// Purely deterministic threshold checks — no ML, no statistics beyond what
// the rule itself specifies. Severity comes directly from the rule that
// fired, so "how bad is this" is always a configuration decision, not an
// inferred one.
export class BusinessRulesEngineService {
  evaluate(
    rules: BusinessRule[],
    metricKey: string,
    input: RuleEvaluationInput,
  ): TriggeredRule[] {
    return rules
      .filter((rule) => rule.metricKey === metricKey && rule.isActive)
      .filter((rule) => this.checkCondition(rule, input))
      .map((rule) => ({
        ruleId: rule.id,
        ruleName: rule.name,
        metricKey: rule.metricKey,
        severity: rule.severity,
        message: this.buildMessage(rule, input),
        thresholdValue: rule.thresholdValue,
        actualValue: this.actualValueFor(rule, input),
      }));
  }

  private checkCondition(rule: BusinessRule, input: RuleEvaluationInput): boolean {
    switch (rule.comparator) {
      case 'VALUE_ABOVE':
        return input.currentValue > rule.thresholdValue;
      case 'VALUE_BELOW':
        return input.currentValue < rule.thresholdValue;
      case 'PERCENT_CHANGE_ABOVE':
        return input.changePercent !== null && input.changePercent > rule.thresholdValue;
      case 'PERCENT_CHANGE_BELOW':
        return input.changePercent !== null && input.changePercent < rule.thresholdValue;
    }
  }

  private actualValueFor(rule: BusinessRule, input: RuleEvaluationInput): number {
    return PERCENT_CHANGE_COMPARATORS.has(rule.comparator) ? (input.changePercent ?? 0) : input.currentValue;
  }

  private buildMessage(rule: BusinessRule, input: RuleEvaluationInput): string {
    const actual = this.actualValueFor(rule, input);
    switch (rule.comparator) {
      case 'VALUE_ABOVE':
        return `${rule.name}: value ${actual} exceeded the threshold of ${rule.thresholdValue}.`;
      case 'VALUE_BELOW':
        return `${rule.name}: value ${actual} fell below the threshold of ${rule.thresholdValue}.`;
      case 'PERCENT_CHANGE_ABOVE':
        return `${rule.name}: change of ${actual}% exceeded the threshold of ${rule.thresholdValue}%.`;
      case 'PERCENT_CHANGE_BELOW':
        return `${rule.name}: change of ${actual}% fell below the threshold of ${rule.thresholdValue}%.`;
    }
  }
}
