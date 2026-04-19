import dotenv from 'dotenv';
dotenv.config();

function getEnv(name: string, defaultValue?: string): string {
  const value = process.env[name] || defaultValue;
  if (!value) {
    throw new Error(`❌ Missing environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: parseInt(getEnv('PORT', '3001')),
  databaseUrl: getEnv('DATABASE_URL'),
  supabaseUrl: getEnv('SUPABASE_URL'),
  supabaseKey: getEnv('SUPABASE_KEY'),
  jwtSecret: getEnv('JWT_SECRET'),
  adminPassword: getEnv('ADMIN_PASSWORD', 'admin123'),
  s3: {
    endpoint: getEnv('S3_ENDPOINT'),
    region: getEnv('S3_REGION', 'us-east-1'),
    accessKey: getEnv('S3_ACCESS_KEY'),
    secretKey: getEnv('S3_SECRET_KEY'),
    bucket: getEnv('S3_BUCKET', 's3'),
  },
  corsOrigin: getEnv('CORS_ORIGIN', 'http://localhost:5173'),
};
