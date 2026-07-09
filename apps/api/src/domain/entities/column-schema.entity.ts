import type { ColumnType } from '@stratiq/shared';

// The inferred shape of one column, detected during parsing/validation and
// persisted on DatasetVersion.schema (JSONB) — this is the domain-level
// counterpart to ColumnSchemaDto.
export interface ColumnSchema {
  name: string;
  type: ColumnType;
  nullable: boolean;
}
