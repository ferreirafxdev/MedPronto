import { Queue, Worker, Job } from 'bullmq';
import { config } from './config';
import IORedis from 'ioredis';

const connection = new IORedis(config.redis.url, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});


// 1. Patient Queue (Management of the consultation flow)
export const patientQueue = new Queue('patient-queue', { connection });

// 2. Document Queue (PDF generation, Signatures, Emails)
export const documentQueue = new Queue('document-queue', { connection });

// -------------------------------------------------------------------------
// Background Worker for heavy tasks
// -------------------------------------------------------------------------
export const documentWorker = new Worker('document-queue', async (job: Job) => {
  const { type, data } = job.data;
  console.log(`[Worker] Processing ${type} for patient ${data.patientId}`);

  switch (type) {
    case 'GENERATE_CONSULTATION':
      // Here we would call the PDF logic
      break;
    case 'GENERATE_ATESTADO':
      // Here we would call the Atestado logic
      break;
    default:
      console.warn(`[Worker] Unknown job type: ${type}`);
  }
}, { connection });

documentWorker.on('completed', (job) => console.log(`✅ Job ${job.id} done.`));
documentWorker.on('failed', (job, err) => console.error(`❌ Job ${job?.id} failed:`, err));
