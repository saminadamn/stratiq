import type { SourceFileType } from '@stratiq/shared';
import type { FileParser } from './file-parser.port.js';

// Use cases depend on this factory, never on a concrete CsvFileParser /
// ExcelFileParser directly — same Dependency Inversion pattern as the
// repository interfaces in domain/repositories.
export interface FileParserFactory {
  getParser(fileType: SourceFileType): FileParser;
}
