import type { RefreshToken } from '../entities/refresh-token.entity.js';

export interface RefreshTokenRepository {
  create(input: { tokenHash: string; userId: string; expiresAt: Date }): Promise<RefreshToken>;
  findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;
  markRotated(id: string, replacedByTokenId: string): Promise<void>;
  revoke(id: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}
