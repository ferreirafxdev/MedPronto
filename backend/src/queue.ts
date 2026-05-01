import { Queue, Worker, Job } from 'bullmq';
import { config } from './config';
import IORedis from 'ioredis';

const connection = new IORedis(config.redis.url, {
  maxRetriesPerRequest: null,
});

// Queues
export const patientQueue = new Queue('patient-queue', { connection });
export const documentQueue = new Queue('document-queue', { connection });

// Worker for background tasks (PDF generation, etc)
export const documentWorker = new Worker('document-queue', async (job: Job) => {
  console.log(`🚀 Processing job ${job.id} of type ${job.name}`);
  
  const { type, data } = job.data;

  if (type === 'GENERATE_PDF') {
    // In a real scenario, we'd call the PDF generation logic here
    // For now, we simulate it
    console.log(`📄 Generating PDF for ${data.patientId}...`);
    // Logic for PDFTemplate and uploadPDF could be moved here
  }

  return { success: true };
}, { connection });

documentWorker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed!`);
});

documentWorker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err);
});
