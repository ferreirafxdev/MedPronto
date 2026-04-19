import sql from './db';
import { v4 as uuidv4 } from 'uuid';

async function migrate() {
    try {
        console.log("🚀 Iniciando migração de códigos de validação...");
        
        // 1. Adicionar a coluna se ela não existir
        await sql`
            ALTER TABLE consultations 
            ADD COLUMN IF NOT EXISTS validation_code TEXT UNIQUE
        `;
        console.log("✅ Coluna validation_code adicionada (ou já existente).");

        // 2. Buscar consultas sem código
        const consultations = await sql`
            SELECT id FROM consultations WHERE validation_code IS NULL
        `;
        
        console.log(`📝 Gerando códigos para ${consultations.length} consultas antigas...`);

        for (const c of consultations) {
            const code = `MP-R-${uuidv4().substring(0, 8).toUpperCase()}`;
            await sql`
                UPDATE consultations 
                SET validation_code = ${code} 
                WHERE id = ${c.id}
            `;
        }

        console.log("✨ Migração concluída com sucesso!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Erro na migração:", err);
        process.exit(1);
    }
}

migrate();
