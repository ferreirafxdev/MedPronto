import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function migrate() {
    console.log('🚀 Iniciando migração para o Supabase...');
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Conectado ao Supabase Postgres.');

        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('📄 Executando schema.sql...');
        await client.query(schema);
        console.log('✅ Migração concluída com sucesso!');

    } catch (err: any) {
        console.error('❌ Erro na migração:', err.message);
    } finally {
        await client.end();
    }
}

migrate();
