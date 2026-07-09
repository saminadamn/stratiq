import type { SourceFileType } from '@stratiq/shared';
import type { FileParser } from '../../application/ports/file-parser.port.js';
import type { FileParserFactory } from '../../application/ports/file-parser-factory.port.js';
import { CsvFileParser } from './csv-file-parser.js';
import { ExcelFileParser } from './excel-file-parser.js';

export class DefaultFileParserFactory implements FileParserFactory {
  private readonly csvParser = new CsvFileParser();
  private readonly excelParser = new ExcelFileParser();

  getParser(fileType: SourceFileType): FileParser {
    return fileType === 'CSV' ? this.csvParser : this.excelParser;
  }
}
