/**
 * Prisma seed manuale — stesso bootstrap del deploy (nessun dato demo).
 * Uso: pnpm prisma:seed
 */
import { PrismaClient } from '@prisma/client';
import { bootstrapDatabase } from '../src/database/bootstrap';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🌱 Bootstrap database (dati reali, nessun mock)...\n');
  await bootstrapDatabase(prisma);
  console.log('\n✅ Seed completato.\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
