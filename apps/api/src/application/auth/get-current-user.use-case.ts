import type { OrganizationMembershipDto, UserDto } from '@stratiq/shared';
import type { UserRepository } from '../../domain/repositories/user.repository.js';
import type { MembershipRepository } from '../../domain/repositories/membership.repository.js';
import { toOrganizationMembershipDto, toUserDto } from './mappers.js';

export interface CurrentUserResult {
  user: UserDto;
  organizations: OrganizationMembershipDto[];
}

export class GetCurrentUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly memberships: MembershipRepository,
  ) {}

  async execute(userId: string): Promise<CurrentUserResult | null> {
    const user = await this.users.findById(userId);
    if (!user) {
      return null;
    }
    const memberships = await this.memberships.listByUser(userId);
    return {
      user: toUserDto(user),
      organizations: memberships.map(toOrganizationMembershipDto),
    };
  }
}
