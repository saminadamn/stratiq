import type { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository.js';
import type { TokenService } from '../ports/token-service.port.js';

export class LogoutUseCase {
  constructor(
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly tokenService: TokenService,
  ) {}

  async execute(presentedRefreshToken: string): Promise<void> {
    const tokenHash = this.tokenService.hashRefreshToken(presentedRefreshToken);
    const stored = await this.refreshTokens.findByTokenHash(tokenHash);
    // Logging out with an already-invalid token is a no-op, not an error — the
    // caller's desired end state (no active session) is already true.
    if (stored && !stored.revokedAt) {
      await this.refreshTokens.revoke(stored.id);
    }
  }
}
