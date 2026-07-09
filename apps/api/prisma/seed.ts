import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Idempotent (upsert-based) so it's safe to run repeatedly against a dev
// database without creating duplicate demo data.
const prisma = new PrismaClient();

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash('password123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'owner@stratiq.dev' },
    update: {},
    create: {
      email: 'owner@stratiq.dev',
      passwordHash,
      name: 'Demo Owner',
    },
  });

  const organization = await prisma.organization.upsert({
    where: { slug: 'demo-workspace' },
    update: {},
    create: {
      name: 'Demo Workspace',
      slug: 'demo-workspace',
    },
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: organization.id } },
    update: {},
    create: {
      userId: user.id,
      organizationId: organization.id,
      role: 'OWNER',
    },
  });

  console.log('Seed complete. Demo login: owner@stratiq.dev / password123');
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
