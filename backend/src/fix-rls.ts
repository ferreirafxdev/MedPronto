import { Client } from 'pg';

const connectionString = 'postgresql://postgres:postgresadmin@db.xpbyihsyblghajbcvudb.supabase.co:5432/postgres';

const fixRls = async () => {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('🔗 Conectado ao PostgreSQL para consertar permissões...');

    // Criar policies permitindo acesso anônimo para as tabelas criadas 
    // ou apenas desativar RLS para usar com a chave publishable livremente.
    await client.query(`
      ALTER TABLE public.patients DISABLE ROW LEVEL SECURITY;
      ALTER TABLE public.doctors DISABLE ROW LEVEL SECURITY;
      ALTER TABLE public.consultations DISABLE ROW LEVEL SECURITY;
    `);
    
    console.log('✅ RLS desativado nas tabelas. A chave anônima (publishable) agora pode inserir e ler dados!');

  } catch (err) {
    console.error('❌ Erro:', err);
  } finally {
    await client.end();
  }
};

fixRls();
