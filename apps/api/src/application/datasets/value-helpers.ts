// Shared cell-level predicates used by both schema inference/validation and
// cleaning operations, so "what counts as a number/date/blank" is defined
// exactly once instead of drifting between the two.

const ISO_DATE_REGEX =
  /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const SLASH_DATE_REGEX = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
const NUMERIC_REGEX = /^-?\d+(\.\d+)?$/;

export function isBlank(value: unknown): boolean {
  return (
    value === null || value === undefined || (typeof value === 'string' && value.trim() === '')
  );
}

export function looksNumeric(value: unknown): boolean {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  if (typeof value !== 'string') {
    return false;
  }
  return NUMERIC_REGEX.test(value.trim());
}

export function toNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string' && NUMERIC_REGEX.test(value.trim())) {
    return Number(value.trim());
  }
  return null;
}

export function looksBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return true;
  }
  return typeof value === 'string' && ['true', 'false'].includes(value.trim().toLowerCase());
}

export function looksDate(value: unknown): boolean {
  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }
  if (typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    return false;
  }
  if (!ISO_DATE_REGEX.test(trimmed) && !SLASH_DATE_REGEX.test(trimmed)) {
    return false;
  }
  return !Number.isNaN(Date.parse(trimmed));
}

// A stable key for row-equality comparisons (duplicate detection): sorts keys
// so column order doesn't affect whether two rows count as duplicates.
export function rowFingerprint(row: Record<string, unknown>): string {
  const sortedEntries = Object.entries(row).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(sortedEntries);
}
