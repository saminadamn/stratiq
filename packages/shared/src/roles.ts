// Mirrors the Prisma `Role` enum (apps/api/prisma/schema.prisma). Kept as a plain
// TypeScript union here (rather than importing the Prisma-generated type) so the
// frontend never depends on `@prisma/client`.
export const ROLES = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] as const;

export type Role = (typeof ROLES)[number];

// Higher index = more privilege. Used for "at least this role" checks instead of
// listing every allowed role at every call site.
const ROLE_RANK: Record<Role, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

export function roleAtLeast(role: Role, minimum: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}
