/**
 * Seed runner — compiled to dist/database/seed-runner.js
 * Called at startup (Docker): sync superadmin + bootstrap if DB vuoto
 */
import { PrismaClient } from '@prisma/client';
import { bootstrapDatabase } from './bootstrap';

const prisma = new PrismaClient();

async function checkIfSeeded(): Promise<boolean> {
  try {
    const count = await prisma.tenant.count({ where: { slug: { not: '_superadmin' } } });
    return count > 0;
  } catch {
    return false;
  }
}

async function main() {
  const forceReseed = process.env.RUN_SEED === 'true';
  const hasAgencyTenant = await checkIfSeeded();

  console.log('\n🌱 Database bootstrap...\n');

  // Superadmin sempre sincronizzato dalle env (password aggiornata ad ogni deploy)
  await bootstrapDatabase(prisma, { full: false });

  if (!hasAgencyTenant || forceReseed) {
    await bootstrapDatabase(prisma, { full: true });
    console.log('\n✅ Bootstrap completato.');
  } else {
    console.log('\nℹ️  Tenant agenzia già presente — skip bootstrap (RUN_SEED=true per forzare).');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📌 SuperAdmin → /superadmin  (tenant: _superadmin)`);
  console.log(`   Email:    ${process.env.SUPER_ADMIN_EMAIL}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch(e => { console.error('Bootstrap failed:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
