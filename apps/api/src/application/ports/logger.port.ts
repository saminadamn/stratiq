// Structured-logging port so infrastructure (pino in production, anything
// else in tests) is swappable without touching call sites — same DI
// convention as every other port in this codebase.
export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}
