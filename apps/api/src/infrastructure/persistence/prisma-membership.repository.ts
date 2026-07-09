import type { PrismaClient } from '@prisma/client';
import type { Role } from '@stratiq/shared';
import type { MembershipRepository } from '../../domain/repositories/membership.repository.js';
import type {
  Membership,
  MembershipWithOrganization,
  MembershipWithUser,
} from '../../domain/entities/membership.entity.js';

export class PrismaMembershipRepository implements MembershipRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: { userId: string; organizationId: string; role: Role }): Promise<Membership> {
    return this.prisma.membership.create({ data: input });
  }

  async findByUserAndOrganization(
    userId: string,
    organizationId: string,
  ): Promise<Membership | null> {
    return this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
  }

  async listByUser(userId: string): Promise<MembershipWithOrganization[]> {
    return this.prisma.membership.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listByOrganization(organizationId: string): Promise<MembershipWithUser[]> {
    return this.prisma.membership.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }
}
