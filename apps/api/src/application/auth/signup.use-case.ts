import type { AuthResponse, Role } from '@stratiq/shared';
import type { UserRepository } from '../../domain/repositories/user.repository.js';
import type { OrganizationRepository } from '../../domain/repositories/organization.repository.js';
import type { MembershipRepository } from '../../domain/repositories/membership.repository.js';
import type { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository.js';
import type { PasswordHasher } from '../ports/password-hasher.port.js';
import type { TokenService } from '../ports/token-service.port.js';
import { EmailAlreadyInUseError } from '../../domain/errors/domain-error.js';
import { generateSlug } from './generate-slug.js';
import { issueTokenPair } from './issue-token-pair.js';
import { toUserDto } from './mappers.js';

export interface SignupInput {
  email: string;
  password: string;
  name: string;
  organizationName: string;
}

const OWNER_ROLE: Role = 'OWNER';

// Every signup creates a user AND its first organization together, as one
// logical operation — see docs/ARCHITECTURE.md ("Signup creates a user and an
// organization") for why there is no organization-less user in this system.
export class SignupUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly organizations: OrganizationRepository,
    private readonly memberships: MembershipRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  async execute(input: SignupInput): Promise<AuthResponse> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new EmailAlreadyInUseError();
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = await this.users.create({
      email: input.email,
      passwordHash,
      name: input.name,
    });

    const slug = await this.uniqueSlugFor(input.organizationName);
    const organization = await this.organizations.create({
      name: input.organizationName,
      slug,
    });

    await this.memberships.create({
      userId: user.id,
      organizationId: organization.id,
      role: OWNER_ROLE,
    });

    const tokens = await issueTokenPair(user, this.tokenService, this.refreshTokens);

    return {
      user: toUserDto(user),
      organizations: [
        {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          createdAt: organization.createdAt.toISOString(),
          role: OWNER_ROLE,
        },
      ],
      tokens,
    };
  }

  private async uniqueSlugFor(name: string): Promise<string> {
    const base = generateSlug(name);
    let candidate = base;
    let suffix = 0;
    // Bounded by organization count in practice; a collision streak this long
    // would indicate a much bigger problem than slug generation.
    while (await this.organizations.findBySlug(candidate)) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
    return candidate;
  }
}
