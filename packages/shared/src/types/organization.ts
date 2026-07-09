import type { Role } from '../roles.js';

export interface OrganizationDto {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

// An organization as seen from the perspective of the current user: includes the
// caller's own role in that org, which the frontend needs to gate UI affordances.
export interface OrganizationMembershipDto extends OrganizationDto {
  role: Role;
}

// One row of an organization's member roster.
export interface OrganizationMemberDto {
  userId: string;
  name: string;
  email: string;
  role: Role;
}
