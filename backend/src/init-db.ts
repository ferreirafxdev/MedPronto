import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ DATABASE_URL não encontrada no .env");
    process.exit(1);
}

const runMigration = async () => {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log("🔗 Conectado ao novo banco Neon!");

        const sql = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8');
        console.log("📜 Executando schema.sql...");
        
        await client.query(sql);
        console.log("✅ Tabelas criadas com sucesso!");

        // Garantir médico de teste
        await client.query(`
            INSERT INTO doctors (name, crm, email, password)
            VALUES ('Dr. Administrador', '123456', 'doctor@admin.com', 'admin123')
            ON CONFLICT (crm) DO NOTHING;
        `);
        console.log("👨‍⚕️ Médico de teste garantido.");

    } catch (err) {
        console.error("❌ Erro na migração:", err);
    } finally {
        await client.end();
    }
};

runMigration();
