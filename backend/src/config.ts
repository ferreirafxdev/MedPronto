import dotenv from 'dotenv';
dotenv.config();

function getEnv(name: string, defaultValue?: string): string {
  const value = process.env[name] || defaultValue;
  if (value === undefined || value === null) {
    return defaultValue !== undefined ? defaultValue : '';
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'supersecretjwt',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
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
    apiKey: process.env.LIVEKIT_API_KEY || 'devkey',
    apiSecret: process.env.LIVEKIT_API_SECRET || 'secretsecretsecretsecretsecretsecret',
  }
};
