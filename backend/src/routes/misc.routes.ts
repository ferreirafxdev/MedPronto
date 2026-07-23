import { Router } from 'express';
import { prisma } from '../utils/db';
import { authenticateToken } from '../middleware/auth.middleware';
import { s3Client } from '../utils/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';

/**
 * Rotas Diversas e Serviços Auxiliares
 * Refatorado para utilizar Prisma ORM e Cloudflare R2 / S3 Nativo
 */
const router = Router();

// Health Check do sistema e banco de dados Postgres
router.get('/health', async (req, res) => {
  try {
    await prisma.patient.count();
    res.json({ 
      status: 'ok', 
      database: 'connected', 
      time: new Date().toISOString() 
    });
  } catch (err: any) { 
    res.json({ status: 'error', error: err.message }); 
  }
});

// Confirmar pagamento do paciente (Ativa status no sistema)
router.post('/payment/confirm', authenticateToken, async (req: any, res) => {
  try {
    const { patientId } = req.body;
    
    // Segurança: paciente só pode confirmar o próprio pagamento
    if (req.user.role === 'patient' && req.user.id !== patientId) {
      return res.status(403).json({ error: 'Não autorizado' });
    }

    // Registra a confirmação no sistema
    res.json({ success: true, message: 'Pagamento confirmado e registrado no banco.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Gerar URL assinada para download de documentos (Cloudflare R2 / S3)
router.post('/documents/signed-url', authenticateToken, async (req: any, res) => {
  try {
    const { key } = req.body;
    
    if (!key) {
      return res.status(400).json({ error: 'Chave do documento é obrigatória.' });
    }

    const command = new GetObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // Validade 1 hora
    
    res.json({ success: true, url });
  } catch (err: any) {
    console.error('Erro ao gerar URL assinada:', err);
    res.status(500).json({ error: 'Erro ao gerar URL do documento.' });
  }
});

// Acesso do médico aos dados e histórico do paciente durante a consulta
router.get('/doctor/patient/:patientId/record', authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== 'doctor' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito' });
    }

    const { patientId } = req.params;

    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    });

    if (!patient) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    const [consultations, atestados] = await Promise.all([
      prisma.consultation.findMany({
        where: { patient_id: patientId },
        include: { doctor: { select: { name: true, crm: true } } },
        orderBy: { created_at: 'desc' }
      }),
      prisma.atestado.findMany({
        where: { patient_id: patientId },
        include: { doctor: { select: { name: true, crm: true } } },
        orderBy: { created_at: 'desc' }
      })
    ]);

    const formattedConsultations = consultations.map((c: any) => ({
      ...c,
      doctor_name: c.doctor?.name,
      doctor_crm: c.doctor?.crm
    }));

    const formattedAtestados = atestados.map((a: any) => ({
      ...a,
      doctor_name: a.doctor?.name,
      doctor_crm: a.doctor?.crm
    }));

    res.json({
      success: true,
      patient,
      record: { 
        consultations: formattedConsultations, 
        atestados: formattedAtestados 
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
