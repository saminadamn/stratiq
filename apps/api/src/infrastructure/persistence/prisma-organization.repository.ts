import type { PrismaClient } from '@prisma/client';
import type { OrganizationRepository } from '../../domain/repositories/organization.repository.js';
import type { Organization } from '../../domain/entities/organization.entity.js';

export class PrismaOrganizationRepository implements OrganizationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: { name: string; slug: string }): Promise<Organization> {
    return this.prisma.organization.create({ data: input });
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({ where: { slug } });
  }
}
