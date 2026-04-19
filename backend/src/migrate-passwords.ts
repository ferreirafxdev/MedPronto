import sql from './db';
import bcrypt from 'bcryptjs';

async function migratePasswords() {
    console.log('🚀 Iniciando migração de senhas dos médicos...');
    try {
        const doctors = await sql`SELECT id, password FROM doctors`;
        let migratedCount = 0;

        for (const doctor of doctors) {
            // Verifica se a senha já parece ser um hash bcrypt
            // Hashes bcrypt geralmente começam com $2a$, $2b$ ou $2y$
            if (!doctor.password.startsWith('$2')) {
                console.log(`Migrando senha para o médico ID: ${doctor.id}`);
                const hashedPassword = await bcrypt.hash(doctor.password, 10);
                await sql`UPDATE doctors SET password = ${hashedPassword} WHERE id = ${doctor.id}`;
                migratedCount++;
            }
        }

        console.log(`✅ Migração concluída! ${migratedCount} senhas foram convertidas para bcrypt.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro durante a migração:', error);
        process.exit(1);
    }
}

migratePasswords();
