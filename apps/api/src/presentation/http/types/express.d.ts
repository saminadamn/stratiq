// Module augmentation: the auth middleware attaches the authenticated user's id
// here so downstream handlers get it type-checked instead of reading an
// untyped `req.someRandomProperty`.
import 'express';
import type { Logger } from '../../../application/ports/logger.port.js';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      // v1.1 (Distributed Systems Showcase). Set by request-id.middleware.ts.
      id?: string;
      logger?: Logger;
    }
  }
}
