import type { AccessTokenPayload } from '@stratiq/shared';

export interface SignedAccessToken {
  token: string;
  expiresAt: Date;
}

// Refresh tokens are opaque to callers of this port: the use case gets back a
// random string plus its expiry and never sees how it's signed/stored — that's
// an infrastructure detail (JWT vs. random bytes, hashing scheme, etc.).
export interface SignedRefreshToken {
  token: string;
  expiresAt: Date;
}

export interface TokenService {
  signAccessToken(payload: Omit<AccessTokenPayload, 'type'>): SignedAccessToken;
  verifyAccessToken(token: string): AccessTokenPayload | null;
  generateRefreshToken(): SignedRefreshToken;
  hashRefreshToken(token: string): string;
}
