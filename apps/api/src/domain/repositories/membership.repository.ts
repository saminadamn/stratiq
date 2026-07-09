import type { Role } from '@stratiq/shared';
import type {
  Membership,
  MembershipWithOrganization,
  MembershipWithUser,
} from '../entities/membership.entity.js';

export interface MembershipRepository {
  create(input: { userId: string; organizationId: string; role: Role }): Promise<Membership>;
  findByUserAndOrganization(userId: string, organizationId: string): Promise<Membership | null>;
  listByUser(userId: string): Promise<MembershipWithOrganization[]>;
  listByOrganization(organizationId: string): Promise<MembershipWithUser[]>;
}
