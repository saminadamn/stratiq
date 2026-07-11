import pino from 'pino';
import type { Logger } from '../../application/ports/logger.port.js';

export class PinoLogger implements Logger {
  private readonly logger: pino.Logger;

  // Two ways to construct: `new PinoLogger(level)` for the top-level
  // process logger, or internally via `child()` wrapping an existing pino
  // instance's `.child()` — never both, so overloads keep the level-based
  // constructor as the only public entry point call sites use.
  constructor(level: string);
  constructor(existing: pino.Logger, _internal: true);
  constructor(levelOrExisting: string | pino.Logger, internal?: true) {
    this.logger =
      internal && typeof levelOrExisting !== 'string'
        ? levelOrExisting
        : pino({ level: levelOrExisting as string });
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

  child(bindings: Record<string, unknown>): Logger {
    return new PinoLogger(this.logger.child(bindings), true);
  }
}
