import type { SourceFileType } from '@stratiq/shared';
import { UnsupportedFileTypeError } from '../../domain/errors/dataset-error.js';

// Browsers/OSes send inconsistent CSV mimetypes (text/csv, application/csv,
// application/vnd.ms-excel when the OS associates .csv with Excel, even
// text/plain), so the file extension is treated as the primary signal and the
// mimetype only as a fallback allow-list — not the other way around.
const CSV_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'text/plain',
]);
const XLSX_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export function detectFileType(originalFileName: string, mimeType: string): SourceFileType {
  const extension = originalFileName.split('.').pop()?.toLowerCase();

  if (extension === 'csv' || (extension === undefined && CSV_MIME_TYPES.has(mimeType))) {
    return 'CSV';
  }
  if (extension === 'xlsx' || (extension === undefined && XLSX_MIME_TYPES.has(mimeType))) {
    return 'XLSX';
  }
  throw new UnsupportedFileTypeError();
}
