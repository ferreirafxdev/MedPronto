require('dotenv').config();
const postgres = require('postgres');

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function run() {
  console.log('--- Iniciando Migração de Colunas de PDF (Supabase) ---');
  try {
    // 1. Coluna para Atestados
    await sql`ALTER TABLE atestados ADD COLUMN IF NOT EXISTS pdf_url TEXT`;
    console.log('✅ Coluna atestados.pdf_url adicionada.');

    // 2. Colunas para Consultas (Receita e Exames)
    await sql`ALTER TABLE consultations ADD COLUMN IF NOT EXISTS receita_pdf_url TEXT`;
    await sql`ALTER TABLE consultations ADD COLUMN IF NOT EXISTS exames_pdf_url TEXT`;
    console.log('✅ Colunas de consultas (receita/exames) adicionadas.');

    console.log('--- Migração Concluída com Sucesso ---');
  } catch (error) {
    console.error('❌ Erro durante a migração:', error.message);
  } finally {
    process.exit(0);
  }
}

run();
