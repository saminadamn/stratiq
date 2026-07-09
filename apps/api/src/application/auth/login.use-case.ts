import type { AuthResponse } from '@stratiq/shared';
import type { UserRepository } from '../../domain/repositories/user.repository.js';
import type { MembershipRepository } from '../../domain/repositories/membership.repository.js';
import type { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository.js';
import type { PasswordHasher } from '../ports/password-hasher.port.js';
import type { TokenService } from '../ports/token-service.port.js';
import { InvalidCredentialsError } from '../../domain/errors/domain-error.js';
import { issueTokenPair } from './issue-token-pair.js';
import { toOrganizationMembershipDto, toUserDto } from './mappers.js';

export interface LoginInput {
  email: string;
  password: string;
}

export class LoginUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly memberships: MembershipRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  async execute(input: LoginInput): Promise<AuthResponse> {
    const user = await this.users.findByEmail(input.email);
    if (!user) {
      // Same error for "no such user" and "wrong password" — distinguishing them
      // would let an attacker enumerate registered emails.
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await this.passwordHasher.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    const memberships = await this.memberships.listByUser(user.id);
    const tokens = await issueTokenPair(user, this.tokenService, this.refreshTokens);

    return {
      user: toUserDto(user),
      organizations: memberships.map(toOrganizationMembershipDto),
      tokens,
    };
  }
}
