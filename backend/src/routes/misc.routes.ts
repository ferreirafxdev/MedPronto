import { Router } from 'express';
import { supabase } from '../utils/supabase';
import { getDailyRoomAndToken } from '../controllers/daily.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { s3Client } from '../utils/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';

const router = Router();

router.get('/health', async (req, res) => {
  try {
    const { error } = await supabase.from('patients').select('id').limit(1);
    res.json({ 
      status: 'ok', 
      supabase: error ? `error: ${error.message}` : 'connected', 
      time: new Date().toISOString() 
    });
  } catch (err: any) { 
    res.json({ status: 'error', error: err.message }); 
  }
});

// Rota de confirmação de pagamento (protegida por autenticação)
router.post('/payment/confirm', authenticateToken, async (req: any, res) => {
  const { patientId } = req.body;
  
  // Segurança: paciente só pode confirmar o próprio pagamento
  if (req.user.role === 'patient' && req.user.id !== patientId) {
    return res.status(403).json({ error: 'Não autorizado' });
  }

  const { error } = await supabase
    .from('patients')
    .update({ has_active_payment: true })
    .eq('id', patientId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, message: 'Pagamento confirmado e registrado no banco.' });
});

// Rota de geração de token Daily.co (protegida por autenticação)
router.post('/daily/token', authenticateToken, getDailyRoomAndToken);

// Rota para gerar URL assinada de documentos armazenados no S3/Supabase Storage
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

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hora
    
    res.json({ success: true, url });
  } catch (err: any) {
    console.error('Erro ao gerar URL assinada:', err);
    res.status(500).json({ error: 'Erro ao gerar URL do documento.' });
  }
});

// Rota para médicos acessarem dados do paciente durante a consulta
router.get('/doctor/patient/:patientId/record', authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== 'doctor' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito' });
    }

    const { patientId } = req.params;

    const [patientRes, consultationsRes, atestadosRes] = await Promise.all([
      supabase.from('patients').select('*').eq('id', patientId).single(),
      supabase.from('consultations').select('*, doctor:doctors(name, crm)').eq('patient_id', patientId).order('created_at', { ascending: false }),
      supabase.from('atestados').select('*, doctor:doctors(name, crm)').eq('patient_id', patientId).order('created_at', { ascending: false })
    ]);

    if (patientRes.error) return res.status(404).json({ error: 'Paciente não encontrado' });

    const consultations = (consultationsRes.data || []).map((c: any) => ({
      ...c,
      doctor_name: c.doctor?.name,
      doctor_crm: c.doctor?.crm
    }));

    const atestados = (atestadosRes.data || []).map((a: any) => ({
      ...a,
      doctor_name: a.doctor?.name,
      doctor_crm: a.doctor?.crm
    }));

    res.json({
      success: true,
      patient: patientRes.data,
      record: { consultations, atestados }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
