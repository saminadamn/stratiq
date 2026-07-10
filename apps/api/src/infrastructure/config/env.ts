import { z } from 'zod';

// Validated once at process startup so a missing/malformed env var fails fast
// with a clear message instead of surfacing as a confusing runtime error deep
// inside a request handler (e.g. `jwt.sign(payload, undefined)`).
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
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
  return parsed.data;
}
