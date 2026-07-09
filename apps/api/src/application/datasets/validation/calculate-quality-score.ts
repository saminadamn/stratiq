import type { ValidationSeverity } from '@stratiq/shared';
import type { ValidationIssue } from '../../../domain/entities/validation-report.entity.js';

// Points deducted when 100% of rows are affected by an issue of this
// severity; scaled down by how much of the dataset actually hit it. E.g. a
// WARNING affecting 10% of rows costs 1.5 points, not the full 15.
const SEVERITY_WEIGHT: Record<ValidationSeverity, number> = {
  ERROR: 40,
  WARNING: 15,
  INFO: 5,
};

export function calculateQualityScore(issues: ValidationIssue[], rowCount: number): number {
  if (rowCount === 0) {
    return 0;
  }

  let score = 100;
  for (const issue of issues) {
    const impactRatio = Math.min(issue.count / rowCount, 1);
    score -= SEVERITY_WEIGHT[issue.severity] * impactRatio;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}
