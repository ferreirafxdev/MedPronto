import { Client } from 'pg';

const connectionString = 'postgresql://postgres:postgresadmin@db.xpbyihsyblghajbcvudb.supabase.co:5432/postgres';

const createTables = async () => {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('🔗 Conectado ao PostgreSQL (Supabase) com sucesso!');

    // Tabela PATIENTS
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.patients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        cpf TEXT UNIQUE NOT NULL,
        age TEXT,
        email TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Tabela "patients" pronta.');

    // Tabela DOCTORS
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.doctors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        crm TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Tabela "doctors" pronta.');

    // Inserindo Doutor Inicial para teste (senha '1234')
    await client.query(`
      INSERT INTO public.doctors (name, crm, email, password)
      VALUES ('Dr. Administrador', '123456', 'doctor@admin.com', '1234')
      ON CONFLICT (crm) DO NOTHING;
    `);
    console.log('👨‍⚕️ Médico de teste garantido no BD.');

    // Tabela CONSULTATIONS (Armazena histórico e URL PDFs do S3)
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.consultations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID REFERENCES public.patients(id),
        patient_cpf TEXT,
        doctor_id UUID REFERENCES public.doctors(id),
        notes TEXT,
        pdf_path TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Tabela "consultations" pronta.');

  } catch (err) {
    console.error('❌ Erro de Migração:', err);
  } finally {
    await client.end();
  }
};

createTables();
