import type { OrganizationMemberDto } from '@stratiq/shared';
import type { MembershipRepository } from '../../domain/repositories/membership.repository.js';

// Authorization (is the caller even allowed to see this roster?) happens in the
// RBAC middleware before this use case runs — it only fetches data, matching
// the single-responsibility split between "can you do this" and "do this".
export class ListOrganizationMembersUseCase {
  constructor(private readonly memberships: MembershipRepository) {}

  async execute(organizationId: string): Promise<OrganizationMemberDto[]> {
    const memberships = await this.memberships.listByOrganization(organizationId);
    return memberships.map((membership) => ({
      userId: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      role: membership.role,
    }));
  }
}
