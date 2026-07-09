import type { Organization } from '../entities/organization.entity.js';

export interface OrganizationRepository {
  create(input: { name: string; slug: string }): Promise<Organization>;
  findBySlug(slug: string): Promise<Organization | null>;
}
