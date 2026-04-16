import Redis from 'ioredis';
import { neon } from '@neondatabase/serverless';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || '';
const DATABASE_URL = process.env.DATABASE_URL || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

async function runTests() {
    console.log('🚀 Iniciando Testes de Conexão...\n');

    // 1. NEON (PostgreSQL)
    try {
        console.log('--- Testando Neon (PostgreSQL) ---');
        const sql = neon(DATABASE_URL);
        const result = await sql`SELECT 1 as connected`;
        if (result[0].connected === 1) {
            console.log('✅ Neon: Conectado com sucesso!\n');
        }
    } catch (err: any) {
        console.log('❌ Neon: Falha na conexão:', err.message, '\n');
    }

    // 2. REDIS (Upstash)
    try {
        console.log('--- Testando Redis (Upstash) ---');
        const redis = new Redis(REDIS_URL, {
            tls: { rejectUnauthorized: false },
            maxRetriesPerRequest: 1
        });

        await redis.set('test_key', 'MedPronto_OK', 'EX', 10);
        const val = await redis.get('test_key');
        if (val === 'MedPronto_OK') {
            console.log('✅ Redis: Conectado e Set/Get funcionando!\n');
        }
        await redis.quit();
    } catch (err: any) {
        console.log('❌ Redis: Falha na conexão:', err.message, '\n');
    }

    // 3. SUPABASE (Storage)
    try {
        console.log('--- Testando Supabase (Storage) ---');
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        const { data, error } = await supabase.storage.listBuckets();
        if (error) throw error;
        console.log('✅ Supabase: Conectado! Buckets encontrados:', data.map(b => b.name).join(', '), '\n');
    } catch (err: any) {
        console.log('❌ Supabase: Falha na conexão:', err.message, '\n');
    }

    console.log('✨ Testes finalizados.');
    process.exit(0);
}

runTests();
