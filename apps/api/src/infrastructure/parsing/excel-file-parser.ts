import ExcelJS from 'exceljs';
import type { FileParser, ParsedTable } from '../../application/ports/file-parser.port.js';

export class ExcelFileParser implements FileParser {
  async parse(buffer: Buffer): Promise<ParsedTable> {
    const workbook = new ExcelJS.Workbook();
    // exceljs types this as NodeJS.Buffer-compatible ArrayBuffer-like input.
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return { columns: [], rows: [] };
    }

    const columns: string[] = [];
    worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
      columns[colNumber - 1] = String(cell.value ?? '').trim();
    });

    const rows: Array<Record<string, unknown>> = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) {
        return;
      }
      const record: Record<string, unknown> = {};
      columns.forEach((columnName, index) => {
        if (!columnName) {
          return;
        }
        record[columnName] = normalizeCellValue(row.getCell(index + 1).value);
      });
      rows.push(record);
    });

    return { columns: columns.filter((name) => name.length > 0), rows };
  }
}

// exceljs represents dates, formulas, and rich text as structured objects
// rather than plain values — flatten them to the plain JS value the rest of
// the pipeline (validation, cleaning) expects to work with.
function normalizeCellValue(value: ExcelJS.CellValue): unknown {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    if ('result' in value && value.result !== undefined) {
      return value.result;
    }
    if ('richText' in value) {
      return value.richText.map((fragment) => fragment.text).join('');
    }
    if ('text' in value) {
      return value.text;
    }
  }
  return value;
}
