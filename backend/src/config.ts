import dotenv from 'dotenv';
dotenv.config();

const INSECURE_DEFAULTS = [
  'supersecretjwt', 'secretsecretsecretsecretsecretsecret', 'devkey',
  'admin123', 'supersecretmedpronto2026'
];

function requireEnv(name: string, insecureDefault?: string): string {
  const value = process.env[name];
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `[CONFIGURAÇÃO] Variável obrigatória ${name} não definida em produção.`
      );
    }
    return insecureDefault || '';
  }
  if (process.env.NODE_ENV === 'production' && INSECURE_DEFAULTS.includes(value)) {
    throw new Error(
      `[SEGURANÇA] ${name} contém valor inseguro padrão em NODE_ENV=production. ` +
      `Configure um segredo forte via variável de ambiente.`
    );
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: requireEnv('JWT_SECRET', 'supersecretjwt'),
  adminPassword: requireEnv('ADMIN_PASSWORD', 'admin123'),
  s3: {
    endpoint: process.env.S3_ENDPOINT || '',
    region: process.env.S3_REGION || 'auto',
    accessKey: process.env.S3_ACCESS_KEY || '',
    secretKey: process.env.S3_SECRET_KEY || '',
    bucket: process.env.S3_BUCKET || 'medpronto-bucket',
  },
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  livekit: {
    url: process.env.LIVEKIT_URL || 'ws://localhost:7880',
    apiKey: requireEnv('LIVEKIT_API_KEY', 'devkey'),
    apiSecret: requireEnv('LIVEKIT_API_SECRET', 'secretsecretsecretsecretsecretsecret'),
  },
  videosdk: {
    // [SEGURANÇA] não há mais valores reais hardcoded como fallback
    apiKey: process.env.VIDEOSDK_API_KEY || '',
    secretKey: process.env.VIDEOSDK_SECRET_KEY || '',
  }
};
