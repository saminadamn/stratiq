import pino from 'pino';
import type { Logger } from '../../application/ports/logger.port.js';

export class PinoLogger implements Logger {
  private readonly logger: pino.Logger;

  constructor(level: string) {
    this.logger = pino({ level });
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(meta ?? {}, message);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(meta ?? {}, message);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.logger.error(meta ?? {}, message);
  }
}
