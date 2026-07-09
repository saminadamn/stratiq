import type { ValidationSeverity } from '@stratiq/shared';

export interface ValidationIssue {
  code: string;
  message: string;
  count: number;
  severity: ValidationSeverity;
  column?: string;
}

export interface ValidationReport {
  rowCount: number;
  columnCount: number;
  issues: ValidationIssue[];
  qualityScore: number;
}
