// The result of parsing a raw CSV/Excel file into a tabular shape, before any
// type inference or validation has run. Cell values are whatever the parser
// produced (usually strings for CSV, mixed types for Excel) — inferring real
// column types is the validation engine's job, not the parser's.
export interface ParsedTable {
  columns: string[];
  rows: Array<Record<string, unknown>>;
}

export interface FileParser {
  parse(buffer: Buffer): Promise<ParsedTable>;
}
