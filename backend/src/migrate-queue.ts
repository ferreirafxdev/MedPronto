import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend folder
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DATABASE_URL = 'postgresql://postgres:postgresadmin@db.wrltuhhfqaqlrgoiafph.supabase.co:5432/postgres';

async function migrate() {
    console.log('🚀 Iniciando migração da tabela de fila...');
    const sql = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false } });

    try {
        await sql`
            CREATE TABLE IF NOT EXISTS queue (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                complaint TEXT NOT NULL,
                status TEXT DEFAULT 'waiting',
                doctor_id UUID REFERENCES doctors(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;
        console.log('✅ Tabela "queue" criada/verificada com sucesso!');
    } catch (err) {
        console.error('❌ Erro na migração:', err);
    } finally {
        await sql.end();
    }
}

migrate();
