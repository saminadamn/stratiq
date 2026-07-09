import type { AuthTokens } from '@stratiq/shared';
import type { User } from '../../domain/entities/user.entity.js';
import type { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository.js';
import type { TokenService } from '../ports/token-service.port.js';

// Shared by signup/login/refresh so the "issue an access token + persist a
// hashed refresh token" sequence can't drift between the three call sites.
export async function issueTokenPair(
  user: User,
  tokenService: TokenService,
  refreshTokens: RefreshTokenRepository,
): Promise<AuthTokens> {
  const accessToken = tokenService.signAccessToken({ sub: user.id, email: user.email });
  const refreshToken = tokenService.generateRefreshToken();
  const tokenHash = tokenService.hashRefreshToken(refreshToken.token);

  await refreshTokens.create({
    tokenHash,
    userId: user.id,
    expiresAt: refreshToken.expiresAt,
  });

  return {
    accessToken: accessToken.token,
    refreshToken: refreshToken.token,
    accessTokenExpiresAt: accessToken.expiresAt.toISOString(),
  };
}
