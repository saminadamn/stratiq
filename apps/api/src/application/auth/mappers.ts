import type { UserDto, OrganizationMembershipDto } from '@stratiq/shared';
import type { User } from '../../domain/entities/user.entity.js';
import type { MembershipWithOrganization } from '../../domain/entities/membership.entity.js';

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toOrganizationMembershipDto(
  membership: MembershipWithOrganization,
): OrganizationMembershipDto {
  return {
    id: membership.organization.id,
    name: membership.organization.name,
    slug: membership.organization.slug,
    createdAt: membership.organization.createdAt.toISOString(),
    role: membership.role,
  };
}
