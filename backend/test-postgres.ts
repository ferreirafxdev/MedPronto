import { prisma } from './src/utils/db';

async function testConnection() {
    console.log('🧪 Testando conexão com PostgreSQL via Prisma...');
    try {
        const count = await prisma.patient.count();
        console.log(`✅ Conexão bem sucedida! Pacientes cadastrados no banco: ${count}`);
    } catch (err: any) {
        console.error('❌ Falha ao conectar no PostgreSQL:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();
