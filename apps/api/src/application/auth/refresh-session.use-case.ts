import type { AuthTokens } from '@stratiq/shared';
import type { UserRepository } from '../../domain/repositories/user.repository.js';
import type { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository.js';
import type { TokenService } from '../ports/token-service.port.js';
import { InvalidRefreshTokenError } from '../../domain/errors/domain-error.js';

// Rotation: each refresh call retires the presented token and issues a new one.
// If a retired token is ever presented again, that can only mean it was copied
// by an attacker before rotation happened, so the whole session is revoked.
export class RefreshSessionUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly tokenService: TokenService,
  ) {}

  async execute(presentedRefreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.tokenService.hashRefreshToken(presentedRefreshToken);
    const stored = await this.refreshTokens.findByTokenHash(tokenHash);

    if (!stored || stored.revokedAt || stored.expiresAt.getTime() < Date.now()) {
      throw new InvalidRefreshTokenError();
    }

    if (stored.replacedByTokenId) {
      await this.refreshTokens.revokeAllForUser(stored.userId);
      throw new InvalidRefreshTokenError();
    }

    const user = await this.users.findById(stored.userId);
    if (!user) {
      throw new InvalidRefreshTokenError();
    }

    const accessToken = this.tokenService.signAccessToken({ sub: user.id, email: user.email });
    const nextRefreshToken = this.tokenService.generateRefreshToken();
    const nextTokenHash = this.tokenService.hashRefreshToken(nextRefreshToken.token);

    const created = await this.refreshTokens.create({
      tokenHash: nextTokenHash,
      userId: user.id,
      expiresAt: nextRefreshToken.expiresAt,
    });
    await this.refreshTokens.markRotated(stored.id, created.id);

    return {
      accessToken: accessToken.token,
      refreshToken: nextRefreshToken.token,
      accessTokenExpiresAt: accessToken.expiresAt.toISOString(),
    };
  }
}
