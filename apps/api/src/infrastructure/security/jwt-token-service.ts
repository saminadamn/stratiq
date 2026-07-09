import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'node:crypto';
import type { AccessTokenPayload } from '@stratiq/shared';
import type {
  SignedAccessToken,
  SignedRefreshToken,
  TokenService,
} from '../../application/ports/token-service.port.js';

export interface JwtTokenServiceConfig {
  accessSecret: string;
  accessTtl: string;
  refreshTtl: string;
}

// Refresh tokens are random bytes, not JWTs: their only job is to be an
// unguessable lookup key for the `RefreshToken` table, so there's no payload to
// sign/verify and therefore nothing gained from JWT's structure for them.
const REFRESH_TOKEN_BYTES = 48;

function ttlToMilliseconds(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) {
    throw new Error(`Invalid TTL format: "${ttl}". Expected e.g. "15m", "30d".`);
  }
  const value = Number(match[1]);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;
  return value * unitMs[unit];
}

export class JwtTokenService implements TokenService {
  constructor(private readonly config: JwtTokenServiceConfig) {}

  signAccessToken(payload: Omit<AccessTokenPayload, 'type'>): SignedAccessToken {
    const fullPayload: AccessTokenPayload = { ...payload, type: 'access' };
    const token = jwt.sign(fullPayload, this.config.accessSecret, {
      expiresIn: this.config.accessTtl,
    } as jwt.SignOptions);
    const expiresAt = new Date(Date.now() + ttlToMilliseconds(this.config.accessTtl));
    return { token, expiresAt };
  }

  verifyAccessToken(token: string): AccessTokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.config.accessSecret);
      if (typeof decoded === 'string' || decoded['type'] !== 'access') {
        return null;
      }
      return decoded as AccessTokenPayload;
    } catch {
      return null;
    }
  }

  generateRefreshToken(): SignedRefreshToken {
    const token = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(Date.now() + ttlToMilliseconds(this.config.refreshTtl));
    return { token, expiresAt };
  }

  hashRefreshToken(token: string): string {
    // Refresh tokens are high-entropy random values (not user-chosen secrets),
    // so a fast SHA-256 lookup hash is appropriate — bcrypt's slow, salted
    // hashing exists to resist brute-forcing low-entropy passwords, which
    // doesn't apply here and would make every refresh call needlessly slow.
    return createHash('sha256').update(token).digest('hex');
  }
}
