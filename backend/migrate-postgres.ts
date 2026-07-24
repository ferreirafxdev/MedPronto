import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function migrate() {
    console.log('🚀 Iniciando sincronização do PostgreSQL...');
    const client = new Client({
        connectionString
    });

    try {
        await client.connect();
        console.log('✅ Conectado ao PostgreSQL com sucesso.');

        const schemaPath = path.join(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            console.log('📄 Executando schema.sql...');
            await client.query(schema);
        }
        console.log('✅ Conexão e sincronização validadas com sucesso!');

    } catch (err: any) {
        console.error('❌ Erro na conexão PostgreSQL:', err.message);
    } finally {
        await client.end();
    }
}

migrate();
