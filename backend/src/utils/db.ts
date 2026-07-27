import { PrismaClient } from '@prisma/client';

// Princípio Singleton para evitar conexões repetidas com Prisma em dev
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Garantia automática de integridade do Schema PostgreSQL na inicialização.
 * Evita erros de colunas faltantes (ex: has_active_payment no Patient).
 */
export async function syncDatabaseSchema() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "has_active_payment" BOOLEAN DEFAULT false;
    `);
    console.log('✅ [DB Sync] Coluna has_active_payment verificada/garantida no PostgreSQL.');
  } catch (err: any) {
    console.warn('⚠️ [DB Sync] Aviso ao sincronizar tabela patients:', err?.message || err);
  }
}

