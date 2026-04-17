import postgres from 'postgres';
import dns from 'dns';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.join(__dirname, '../.env') });

// Force IPv4
dns.setDefaultResultOrder('ipv4first');

async function testConnection() {
    console.log("🔍 Iniciando teste de conexão com o Banco de Dados...");
    console.log("📍 URL:", process.env.DATABASE_URL?.split('@')[1]); // Log partial URL for safety

    const sql = postgres(process.env.DATABASE_URL as string, {
        ssl: 'require',
        connect_timeout: 10
    });

    try {
        console.log("⏳ Conectando...");
        const result = await sql`SELECT NOW() as now, version() as version`;
        console.log("✅ Conexão bem-sucedida!");
        console.log("🕒 Data do Servidor:", result[0].now);
        console.log("📦 Versão Postgres:", result[0].version);
        
        // Testar acesso a uma tabela
        const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 5`;
        console.log("📂 Tabelas encontradas:", tables.map(t => t.table_name).join(', '));

    } catch (error: any) {
        console.error("❌ Erro na conexão:");
        console.error("Mensagem:", error.message);
        console.error("Código:", error.code);
        
        if (error.message.includes('EAI_AGAIN')) {
            console.error("💡 Dica: Erro de DNS Detectado. Verifique se o host está correto ou se há bloqueio de IPv6.");
        }
    } finally {
        await sql.end();
        process.exit();
    }
}

testConnection();
