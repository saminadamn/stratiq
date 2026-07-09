// Module augmentation: the auth middleware attaches the authenticated user's id
// here so downstream handlers get it type-checked instead of reading an
// untyped `req.someRandomProperty`.
import 'express';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}
