// Structured-logging port so infrastructure (pino in production, anything
// else in tests) is swappable without touching call sites — same DI
// convention as every other port in this codebase.
export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  // v1.1 (Distributed Systems Showcase). Returns a Logger whose every call
  // carries `bindings` automatically — used to attach a request's
  // correlation ID once (see request-id.middleware.ts) instead of passing
  // `requestId` into every individual log call by hand.
  child(bindings: Record<string, unknown>): Logger;
}
