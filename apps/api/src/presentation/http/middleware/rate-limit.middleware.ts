import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';

// Applied to every /api/v1 request — a generous ceiling meant to absorb
// misbehaving clients/retries, not to police normal traffic.
export function createGlobalRateLimiter(windowMs: number, max: number): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
  });
}

// Login/signup are brute-force/credential-stuffing targets, so they get a
// much tighter budget than the rest of the API. Fixed rather than env-driven:
// this is a security control, not an operational tuning knob, and deriving it
// from the global limit would let a looser global setting silently weaken it.
export function createAuthRateLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many attempts. Please try again later.',
      },
    },
  });
}
