import sql from './db';

const migrate = async () => {
    try {
        console.log('🔄 Adicionando coluna birth_date na tabela patients...');
        await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS birth_date TEXT`;
        console.log('✅ Coluna birth_date adicionada com sucesso!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Erro durante a migração:', err);
        process.exit(1);
    }
};

migrate();
