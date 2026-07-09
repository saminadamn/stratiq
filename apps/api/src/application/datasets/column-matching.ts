import type { ColumnSchema } from '../../domain/entities/column-schema.entity.js';

// Shared by every heuristic column-role detector (Sprint 2 feature
// engineering, Sprint 3 analytics) so "find the first column matching this
// naming pattern, optionally of this type" is defined exactly once instead
// of drifting between bounded contexts.
export function findColumnByPattern(
  schema: ColumnSchema[],
  pattern: RegExp,
  requiredType?: ColumnSchema['type'],
): string | null {
  const match = schema.find(
    (column) => pattern.test(column.name) && (!requiredType || column.type === requiredType),
  );
  return match?.name ?? null;
}
