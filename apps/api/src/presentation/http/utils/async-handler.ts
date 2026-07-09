import type { NextFunction, Request, RequestHandler, Response } from 'express';

// Express doesn't await handlers, so a rejected promise inside an async handler
// would otherwise become an unhandled rejection instead of reaching
// errorHandlerMiddleware. This wrapper is the one place that gets fixed.
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
