/**
 * Idempotent account seed for LearnFlow.
 *
 * This script does not create courses, assessments, or analytics data. It only
 * bootstraps real operator accounts from environment variables so a fresh
 * deployment has a way to sign in. Run it explicitly with `pnpm prisma:seed`.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PrismaClient, type Role } from '../apps/api/src/generated/prisma/client';

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error('[seed] DATABASE_URL (or DIRECT_URL) is required.');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

interface SeedAccount {
  name: string | undefined;
  email: string | undefined;
  role: Role;
}

function accountsFromEnv(): SeedAccount[] {
  return [
    {
      name: process.env.SEED_ADMIN_NAME ?? 'LearnFlow Administrator',
      email: process.env.SEED_ADMIN_EMAIL,
      role: 'ADMIN',
    },
    {
      name: process.env.SEED_INSTRUCTOR_NAME ?? 'LearnFlow Instructor',
      email: process.env.SEED_INSTRUCTOR_EMAIL,
      role: 'INSTRUCTOR',
    },
    {
      name: process.env.SEED_STUDENT_NAME ?? 'LearnFlow Student',
      email: process.env.SEED_STUDENT_EMAIL,
      role: 'STUDENT',
    },
  ];
}

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

async function main(): Promise<void> {
  const password = process.env.SEED_PASSWORD;
  const accounts = accountsFromEnv().filter(
    (account): account is SeedAccount & { email: string } => Boolean(account.email),
  );

  if (accounts.length === 0) {
    console.log(
      '[seed] No SEED_*_EMAIL variables are set. Nothing to do. Provide SEED_PASSWORD and at least one account email.',
    );
    return;
  }
  if (!password || password.length < 12) {
    console.error('[seed] SEED_PASSWORD must be set and at least 12 characters long.');
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  for (const account of accounts) {
    const email = account.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`[seed] Account already exists, leaving it unchanged: ${email}`);
      continue;
    }
    await prisma.user.create({
      data: {
        name: account.name?.trim() || account.role.toLowerCase(),
        email,
        passwordHash,
        role: account.role,
        isActive: true,
      },
    });
    console.log(`[seed] Created ${account.role} account: ${email}`);
  }
}

main()
  .catch((error) => {
    console.error('[seed] Failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
