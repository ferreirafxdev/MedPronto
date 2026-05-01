import { Queue, Worker, Job } from 'bullmq';
import { config } from './config';
import IORedis from 'ioredis';
import { supabase } from './utils/supabase';
import { uploadPDF } from './utils/s3';
import { PDFTemplate } from './PDFTemplate';

const connection = new IORedis(config.redis.url, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const patientQueue = new Queue('patient-queue', { connection });
export const documentQueue = new Queue('document-queue', { connection });

async function generatePDFBuffer(type: string, data: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const template = new PDFTemplate();
      const doc = template.getDocument();
      const chunks: any[] = [];

      doc.on('data', (chunk: any) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: any) => reject(err));

      if (type === 'GENERATE_ATESTADO') {
        template.drawLayout('Atestado Médico');
        template.addContent(data.content);
        template.addSection('Período de Afastamento', `${data.daysOff} dias`);
        if (data.cid) template.addSection('CID', data.cid);
      } else {
        template.drawLayout('Prontuário Médico & Prescrições');
        template.addSection('Notas da Consulta', data.notes);
        template.addSection('Prescrições', data.prescriptions);
        if (data.exams) template.addSection('Exames Solicitados', data.exams);
      }

      // Fetch doctor info for footer (simplified for now)
      template.finalizeWithFooter('MedPronto Digital', 'CRM-SP 00000', data.validationCode);
    } catch (err) {
      reject(err);
    }
  });
}

export const documentWorker = new Worker('document-queue', async (job: Job) => {
  const { type, data } = job.data;
  console.log(`[Worker] Processing ${type} for patient ${data.patientId}`);

  try {
    const pdfBuffer = await generatePDFBuffer(type, data);
    const fileName = `${type}_${data.validationCode}.pdf`;
    const folder = type === 'GENERATE_ATESTADO' ? 'atestados' : 'consultations';
    const filePath = `${folder}/${fileName}`;

    await uploadPDF(config.s3.bucket, filePath, pdfBuffer);

    // Update Supabase with the PDF path
    const table = type === 'GENERATE_ATESTADO' ? 'atestados' : 'consultations';
    const codeColumn = type === 'GENERATE_ATESTADO' ? 'code' : 'validation_code';

    await supabase.from(table)
      .update({ pdf_path: filePath })
      .eq(codeColumn, data.validationCode);

    console.log(`✅ ${type} processed and uploaded: ${filePath}`);
  } catch (err) {
    console.error(`❌ Error processing ${type}:`, err);
    throw err;
  }
}, { connection });

documentWorker.on('completed', (job) => console.log(`✅ Job ${job.id} finished successfully.`));
documentWorker.on('failed', (job, err) => console.error(`❌ Job ${job?.id} failed:`, err));
