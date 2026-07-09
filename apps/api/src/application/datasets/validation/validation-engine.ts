import type { ColumnSchema } from '../../../domain/entities/column-schema.entity.js';
import type { ValidationReport } from '../../../domain/entities/validation-report.entity.js';
import type { ParsedTable } from '../../ports/file-parser.port.js';
import { calculateQualityScore } from './calculate-quality-score.js';
import { ColumnConsistencyValidator } from './column-consistency.validator.js';
import { DataTypeValidator } from './data-type.validator.js';
import { DuplicateRowsValidator } from './duplicate-rows.validator.js';
import { InvalidDatesValidator } from './invalid-dates.validator.js';
import { MissingValuesValidator } from './missing-values.validator.js';
import { NegativeValuesValidator } from './negative-values.validator.js';
import type { Validator } from './validator.js';

// Each validator is independent and stateless, so the engine is just a fixed
// list plus a fold — adding a new rule means adding one line here, not
// touching the ETL pipeline or any other validator.
export class ValidationEngine {
  private readonly validators: Validator[] = [
    new MissingValuesValidator(),
    new DuplicateRowsValidator(),
    new DataTypeValidator(),
    new InvalidDatesValidator(),
    new NegativeValuesValidator(),
    new ColumnConsistencyValidator(),
  ];

  run(table: ParsedTable, schema: ColumnSchema[]): ValidationReport {
    const issues = this.validators.flatMap((validator) => validator.validate(table, schema));
    return {
      rowCount: table.rows.length,
      columnCount: table.columns.length,
      issues,
      qualityScore: calculateQualityScore(issues, table.rows.length),
    };
  }
}
