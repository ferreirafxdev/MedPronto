import fs from 'fs';
import path from 'path';
import { config } from '../config';

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');

export async function uploadPDF(bucketName: string, filePath: string, body: Buffer): Promise<string> {
  const fullPath = path.join(UPLOADS_DIR, filePath);
  const dir = path.dirname(fullPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  await fs.promises.writeFile(fullPath, body);
  console.log(`[Storage Local] PDF salvo com sucesso em: ${fullPath}`);
  return filePath;
}

