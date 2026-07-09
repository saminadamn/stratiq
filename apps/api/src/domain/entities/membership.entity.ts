import type { Role } from '@stratiq/shared';

export interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  role: Role;
  createdAt: Date;
}

// A membership joined with its organization — the shape most use cases actually
// need (e.g. "list the organizations this user belongs to, with their role").
export interface MembershipWithOrganization extends Membership {
  organization: {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
  };
}

// The inverse join — a membership row with the user attached, for listing an
// organization's roster (the concrete resource RBAC in this codebase protects).
export interface MembershipWithUser extends Membership {
  user: {
    id: string;
    name: string;
    email: string;
  };
}
