import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || '';

async function migrate() {
    if (!DATABASE_URL) {
        console.error('❌ DATABASE_URL não encontrada no .env');
        process.exit(1);
    }

    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🚀 Iniciando migração do banco de dados Neon via PG Client...');
        await client.connect();
        
        const schemaPath = path.join(__dirname, '../schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Execute as a single block to handle multi-line commands correctly
        await client.query(schema);

        console.log('✅ Migração concluída com sucesso! Todas as tabelas foram criadas.');
    } catch (err: any) {
        console.error('❌ Erro durante a migração:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrate();
