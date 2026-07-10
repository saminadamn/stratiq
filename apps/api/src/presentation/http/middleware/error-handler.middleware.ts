import type { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { DomainError } from '../../../domain/errors/domain-error.js';
import type { Logger } from '../../../application/ports/logger.port.js';

// Centralized so every controller can just `throw` — a DomainError knows its
// own HTTP status, a ZodError means the request body failed validation, and
// anything else is an unexpected 500 that gets logged but not leaked to the client.
// Factory (not a bare function) so the composition root can inject the
// structured logger the same way every other dependency is wired.
export function createErrorHandlerMiddleware(logger: Logger) {
  return function errorHandlerMiddleware(
    err: unknown,
    req: Request,
    res: Response,
    _next: NextFunction,
  ): void {
    if (err instanceof DomainError) {
      res.status(err.httpStatus).json({ error: { code: err.code, message: err.message } });
      return;
    }

    if (err instanceof ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request payload failed validation.',
          details: err.flatten(),
        },
      });
      return;
    }

    // Multer rejects an oversized upload before any dataset use case runs, so
    // it never gets the chance to throw our own FileTooLargeError — translated
    // here instead (Sprint 2: dataset uploads).
    if (err instanceof MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        error: { code: 'FILE_TOO_LARGE', message: 'Uploaded file exceeds the maximum allowed size.' },
      });
      return;
    }

    logger.error('Unhandled request error', {
      method: req.method,
      path: req.path,
      error: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err,
    });
    res.status(500).json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong.' },
    });
  };
}
