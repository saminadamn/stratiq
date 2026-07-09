import type { NextFunction, Request, Response } from 'express';
import { roleAtLeast, type Role } from '@stratiq/shared';
import type { MembershipRepository } from '../../../domain/repositories/membership.repository.js';

// RBAC gate for any route shaped `/organizations/:organizationId/...`. It only
// decides "is this request allowed to proceed" — the handler it guards stays
// free of authorization logic, matching the domain error split
// (NotAMemberError / InsufficientRoleError) documented in domain/errors.
export function createRequireRoleMiddleware(memberships: MembershipRepository, minimumRole: Role) {
  return async function requireRole(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const organizationId = req.params['organizationId'];
    if (!req.userId || !organizationId) {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'An organization id is required.' },
      });
      return;
    }

    const membership = await memberships.findByUserAndOrganization(req.userId, organizationId);
    if (!membership) {
      res.status(403).json({
        error: { code: 'NOT_A_MEMBER', message: 'You are not a member of this organization.' },
      });
      return;
    }

    if (!roleAtLeast(membership.role, minimumRole)) {
      res.status(403).json({
        error: {
          code: 'INSUFFICIENT_ROLE',
          message: 'You do not have permission to perform this action.',
        },
      });
      return;
    }

    next();
  };
}
