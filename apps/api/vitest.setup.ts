import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Loads the monorepo's single root .env for tests run on the host (matching
// the --env-file pattern used by the dev/seed scripts). In CI, real env vars
// are provided directly and there's no .env file — that's fine, this is a
// no-op then.
const rootEnvPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env');
try {
  process.loadEnvFile(rootEnvPath);
} catch {
  // No .env present — assume the environment already has what it needs.
}
