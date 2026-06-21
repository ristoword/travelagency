/**
 * Seed runner — compiled to dist/database/seed-runner.js
 * Called at startup (Docker): sincronizza sempre credenziali da env
 */
import { PrismaClient } from '@prisma/client';
import { bootstrapDatabase } from './bootstrap';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🌱 Database bootstrap (sync credenziali)...\n');

  const { superAdmin: sa, owner } = await bootstrapDatabase(prisma);

  console.log('\n✅ Bootstrap completato.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📌 SuperAdmin → /superadmin');
  console.log(`   Tenant:   _superadmin`);
  console.log(`   Email:    ${sa.email}`);
  if (owner) {
    console.log('📌 Agenzia → /login');
    console.log(`   Tenant:   ${owner.slug}`);
    console.log(`   Email:    ${owner.email}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch(e => { console.error('Bootstrap failed:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
