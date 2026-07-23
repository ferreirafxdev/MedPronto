import { Queue, Worker, Job } from 'bullmq';
import { config } from './config';
import IORedis from 'ioredis';
import { prisma } from './utils/db';
import { uploadPDF } from './utils/s3';
import { PDFTemplate } from './PDFTemplate';

const connection = new IORedis(config.redis.url, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const patientQueue = new Queue('patient-queue', { connection });
export const documentQueue = new Queue('document-queue', { connection });

async function generatePDFBuffer(type: string, data: any): Promise<Buffer> {
  // Busca informações do paciente e do médico via Prisma para inclusão dinâmica no PDF
  const [patient, doctor] = await Promise.all([
    prisma.patient.findUnique({ where: { id: data.patientId } }),
    prisma.doctor.findUnique({ where: { id: data.doctorId } })
  ]);
  const patientName = patient?.name || 'Paciente';
  const doctorName = doctor?.name || 'Médico';
  const doctorCRM = doctor?.crm || 'CRM-SP 00000';

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
        template.addSection('Paciente', patientName);
        template.addContent(data.content);
        template.addSection('Período de Afastamento', `${data.daysOff} dias`);
        if (data.cid) template.addSection('CID', data.cid);
      } else {
        template.drawLayout('Receituário & Evolução');
        template.addSection('Paciente', patientName);
        template.addSection('Evolução Clínica', data.notes);
        template.addSection('Prescrições', data.prescriptions);
        if (data.exams) template.addSection('Exames Solicitados', data.exams);
      }

      template.finalizeWithFooter(doctorName, doctorCRM, data.validationCode);
    } catch (err) {
      reject(err);
    }
  });
}

// Background Worker para processar geração assíncrona de PDFs
export const documentWorker = new Worker('document-queue', async (job: Job) => {
  const { type, data } = job.data;
  console.log(`[Worker] Processing ${type} for patient ${data.patientId}`);

  try {
    const pdfBuffer = await generatePDFBuffer(type, data);
    const fileName = `${type}_${data.validationCode}.pdf`;
    const folder = type === 'GENERATE_ATESTADO' ? 'atestados' : 'consultations';
    const filePath = `${folder}/${fileName}`;

    // Cloudflare R2 / AWS S3 Upload (Mantido conforme Fase 3)
    await uploadPDF(config.s3.bucket, filePath, pdfBuffer);

    // Update PostgreSQL via Prisma with the PDF path
    if (type === 'GENERATE_ATESTADO') {
      await prisma.atestado.update({
        where: { code: data.validationCode },
        data: { pdf_path: filePath }
      });
    } else {
      await prisma.consultation.update({
        where: { validation_code: data.validationCode },
        data: { pdf_path: filePath }
      });
    }

    console.log(`✅ ${type} processed and uploaded: ${filePath}`);
  } catch (err) {
    console.error(`❌ Error processing ${type}:`, err);
    throw err;
  }
}, { connection });

documentWorker.on('completed', (job) => console.log(`✅ Job ${job.id} finished successfully.`));
documentWorker.on('failed', (job, err) => console.error(`❌ Job ${job?.id} failed:`, err));
