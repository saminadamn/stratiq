import { parse } from 'csv-parse/sync';
import type { FileParser, ParsedTable } from '../../application/ports/file-parser.port.js';

export class CsvFileParser implements FileParser {
  async parse(buffer: Buffer): Promise<ParsedTable> {
    const records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      // Whitespace trimming is a cleaning *operation* the user opts into
      // (TRIM_WHITESPACE), not something the parser silently does — the
      // validation report needs to see the raw values to flag them.
      trim: false,
      bom: true,
      relax_column_count: true,
    }) as Array<Record<string, string>>;

    const columns = records.length > 0 ? Object.keys(records[0] as Record<string, string>) : [];
    return { columns, rows: records };
  }
}
