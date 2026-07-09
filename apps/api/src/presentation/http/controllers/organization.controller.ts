import type { Request, Response } from 'express';
import type { ListMyOrganizationsUseCase } from '../../../application/organizations/list-my-organizations.use-case.js';
import type { ListOrganizationMembersUseCase } from '../../../application/organizations/list-organization-members.use-case.js';
import { asyncHandler } from '../utils/async-handler.js';

export interface OrganizationControllerDeps {
  listMyOrganizations: ListMyOrganizationsUseCase;
  listMembers: ListOrganizationMembersUseCase;
}

export function createOrganizationController(deps: OrganizationControllerDeps) {
  return {
    listMine: asyncHandler(async (req: Request, res: Response) => {
      const organizations = await deps.listMyOrganizations.execute(req.userId as string);
      res.status(200).json({ organizations });
    }),

    // Reachable only via a route guarded by requireRole(memberships, 'VIEWER') —
    // i.e. any confirmed member of :organizationId, enforced before this runs.
    listMembers: asyncHandler(async (req: Request, res: Response) => {
      const organizationId = req.params['organizationId'] as string;
      const members = await deps.listMembers.execute(organizationId);
      res.status(200).json({ members });
    }),
  };
}
