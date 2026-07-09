import type { OrganizationMembershipDto } from '@stratiq/shared';
import type { MembershipRepository } from '../../domain/repositories/membership.repository.js';
import { toOrganizationMembershipDto } from '../auth/mappers.js';

export class ListMyOrganizationsUseCase {
  constructor(private readonly memberships: MembershipRepository) {}

  async execute(userId: string): Promise<OrganizationMembershipDto[]> {
    const memberships = await this.memberships.listByUser(userId);
    return memberships.map(toOrganizationMembershipDto);
  }
}
