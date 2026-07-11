import { z } from 'zod';

// The literal placeholder values shipped in .env.example — safe for local
// dev (where anyone can read them from source control) but never safe to run
// a production deployment with, since anyone can read source control.
const PLACEHOLDER_SECRETS = new Set([
  'replace-with-a-long-random-string-min-32-chars',
  'replace-with-a-different-long-random-string-min-32-chars',
]);

// Validated once at process startup so a missing/malformed env var fails fast
// with a clear message instead of surfacing as a confusing runtime error deep
// inside a request handler (e.g. `jwt.sign(payload, undefined)`).
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    // Most PaaS hosts (Render, Railway, Heroku) assign a port dynamically and
    // inject it as `PORT`, which always wins over API_PORT when both are set
    // — see the coercion below. API_PORT alone still works for local/Docker
    // setups that don't have that convention.
    API_PORT: z.coerce.number().int().positive().default(4000),
    PORT: z.coerce.number().int().positive().optional(),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_ACCESS_TTL: z.string().default('15m'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    JWT_REFRESH_TTL: z.string().default('30d'),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),

    // Sprint 2 (Data Management & ETL). STORAGE_ROOT is resolved relative to the
    // api package's cwd when not absolute; Docker mounts a volume there so
    // uploads survive container restarts (see docker/docker-compose.yml).
    STORAGE_ROOT: z.string().default('./storage'),
    MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(25),

    // v1.0 (Predictive Intelligence). The ML service is internal-only — this
    // is a Docker-network hostname in production, not a public URL.
    ML_SERVICE_URL: z.string().default('http://localhost:8000'),

    // v1.0 (Production Readiness).
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    RATE_LIMIT_WINDOW_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(15 * 60 * 1000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),

    // v1.1 (Distributed Systems Showcase). Unset by default — every
    // Redis-backed feature (analytics cache, rate-limit store, report
    // queue) falls back to its single-process equivalent when REDIS_URL is
    // absent, so local dev and a Redis-less deploy keep working unchanged.
    REDIS_URL: z.string().optional(),
    REDIS_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(86400),
    // "embedded" runs the report-generation worker inside this process —
    // the only option that works on a single free-tier PaaS service.
    // "standalone" is for the dedicated `worker` container in
    // docker-compose, which lets the API stop double-consuming the queue.
    WORKER_MODE: z.enum(['embedded', 'standalone']).default('embedded'),
  })
  .superRefine((env, ctx) => {
    // Fails fast at boot rather than letting a copy-pasted .env.example ever
    // reach a real deployment with guessable, publicly-known JWT secrets.
    if (env.NODE_ENV !== 'production') {
      return;
    }
    for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const) {
      if (PLACEHOLDER_SECRETS.has(env[key])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is still set to the .env.example placeholder — replace it with a real secret before running in production.`,
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(
      (issue) => `  - ${issue.path.join('.')}: ${issue.message}`,
    );
    throw new Error(`Invalid environment configuration:\n${issues.join('\n')}`);
  }
  const env = parsed.data;
  if (env.PORT !== undefined) {
    env.API_PORT = env.PORT;
  }
  return env;
}
