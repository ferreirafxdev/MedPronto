import IORedis from 'ioredis';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carrega o .env manualmente para o teste
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testRedis() {
  const redisUrl = process.env.REDIS_URL;
  console.log('Tentando conectar ao Redis em:', redisUrl ? 'URL encontrada' : 'URL não encontrada');

  if (!redisUrl) {
    console.error('Erro: REDIS_URL não está definida no arquivo .env');
    return;
  }

  const redis = new IORedis(redisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
  });

  try {
    const result = await redis.ping();
    console.log('✅ Conexão bem-sucedida! Resposta do Redis:', result);
  } catch (err: any) {
    console.error('❌ Falha na conexão com o Redis:', err.message);
  } finally {
    redis.disconnect();
  }
}

testRedis();
