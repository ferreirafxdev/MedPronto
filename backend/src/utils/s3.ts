import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from '../config';

const { s3 } = config;

export const s3Client = new S3Client({
  endpoint: s3.endpoint,
  region: s3.region,
  credentials: { accessKeyId: s3.accessKey, secretAccessKey: s3.secretKey },
  forcePathStyle: true
});

export async function uploadPDF(bucketName: string, filePath: string, body: Buffer) {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: filePath,
    Body: body,
    ContentType: 'application/pdf',
  });
  await s3Client.send(command);
  return filePath;
}
