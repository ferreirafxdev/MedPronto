import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from './config';
import dns from 'dns';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { supabase } from './utils/supabase';
import { s3Client, uploadPDF } from './utils/s3';

import { patientQueue, documentQueue } from './queue';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import morgan from 'morgan';

// Fix for Supabase IPv6 connection issues
dns.setDefaultResultOrder('ipv4first');
dotenv.config();

const app = express();
const { supabaseUrl, supabaseKey, jwtSecret, adminPassword, s3 } = config;

// -- Middleware Definitions First --
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Não autorizado' });

  jwt.verify(token, jwtSecret, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
};

const authorizeAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito' });
  next();
};

const authorizeDoctor = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'doctor' && req.user?.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito' });
  next();
};

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://med-pronto-wph4.vercel.app',
  'https://medpronto-online.vercel.app',
  /\.vercel\.app$/
];

app.use(helmet({ contentSecurityPolicy: false })); // Disable CSP for local testing/dashboards if needed
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.set('trust proxy', 1);
app.use(express.json());

// -- Infrastructure Dashboard (Queues) --
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
createBullBoard({
  queues: [new BullMQAdapter(patientQueue), new BullMQAdapter(documentQueue)],
  serverAdapter: serverAdapter,
});
app.use('/admin/queues', authenticateToken, authorizeAdmin, serverAdapter.getRouter());

// -- In-memory Log Buffer for Dashboard --
const logBuffer: string[] = [];

const addLog = (msg: string) => {
  logBuffer.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
  if (logBuffer.length > 50) logBuffer.pop();
};

app.use(morgan((tokens, req, res) => {
  const msg = [
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
    tokens.res(req, res, 'content-length'), '-',
    tokens['response-time'](req, res), 'ms'
  ].join(' ');
  addLog(msg);
  return msg;
}));

// -- Infrastructure Status Endpoint --
app.get('/api/admin/infra-status', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { error: sbError } = await supabase.from('patients').select('id').limit(1);
    
    // Redis Status
    let redisStatus = 'connected';
    try {
      const client = await patientQueue.client;
      await client.ping();
    } catch (e) { redisStatus = 'disconnected'; }


    res.json({
      success: true,
      services: {
        api: 'online',
        supabase: sbError ? 'error' : 'online',
        redis: redisStatus,
      },
      queues: {
        waiting: await patientQueue.count(),
        documents: await documentQueue.count(),
      },
      logs: logBuffer
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const generalLimiter = rateLimit({ windowMs: 1 * 60 * 1000, max: 100 });
app.use(generalLimiter);

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const validateLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 100 });

app.get('/api/health', async (req, res) => {
  try {
    const { error } = await supabase.from('patients').select('id').limit(1);
    if (error) console.error("Supabase Health Error:", error);
    res.json({ status: 'ok', supabase: error ? `error: ${error.message}` : 'connected', time: new Date().toISOString() });
  } catch (err: any) { 
    console.error("Health Check Exception:", err);
    res.json({ status: 'error', error: err.message }); 
  }
});



// -- Routes --

app.post('/api/patient/auth', authLimiter, async (req, res) => {
  try {
    const { cpf, birthDate } = req.body;
    const { data: patient, error } = await supabase.from('patients').select('*').eq('cpf', cpf).eq('birth_date', birthDate).single();
    if (error || !patient) return res.status(401).json({ error: 'Credenciais inválidas' });
    const token = jwt.sign({ id: patient.id, name: patient.name, role: 'patient' }, jwtSecret, { expiresIn: '24h' });
    res.json({ success: true, patient, token });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/patient/register', authLimiter, async (req, res) => {
  try {
    const { name, cpf, age, email, birthDate } = req.body;
    const { data: patient, error } = await supabase.from('patients').insert([{ name, cpf, age, email, birth_date: birthDate }]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    const token = jwt.sign({ id: patient.id, name: patient.name, role: 'patient' }, jwtSecret, { expiresIn: '24h' });
    res.json({ success: true, patient, token });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/doctor/auth', authLimiter, async (req, res) => {
  try {
    const { login, password } = req.body;
    const { data: doctor, error } = await supabase.from('doctors').select('*').or(`crm.eq.${login},email.eq.${login}`).single();
    if (error || !doctor || !doctor.password) return res.status(401).json({ error: 'Credenciais inválidas' });
    const isPasswordCorrect = await bcrypt.compare(password, doctor.password);
    if (!isPasswordCorrect) return res.status(401).json({ error: 'Credenciais inválidas' });
    const token = jwt.sign({ id: doctor.id, name: doctor.name, role: 'doctor' }, jwtSecret, { expiresIn: '8h' });
    res.json({ success: true, doctor, token });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/auth', async (req, res) => {
  try {
    const { login, password } = req.body;
    if (login === 'admin@medpronto.com' && password === adminPassword) {
      const token = jwt.sign({ id: 'admin-01', name: 'Admin', role: 'admin' }, jwtSecret, { expiresIn: '12h' });
      res.json({ success: true, admin: { id: 'admin-01', name: 'Admin', role: 'admin' }, token });
    } else { res.status(401).json({ error: 'Inválido' }); }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/enqueue', authenticateToken, async (req: any, res) => {
  try {
    const { id, name, complaint } = req.body;
    console.log(`[Queue] Enqueue request for ${name} (${id})`);
    
    if (req.user.role === 'patient' && req.user.id !== id) {
      return res.status(403).json({ error: 'Não autorizado' });
    }

    // Add to Redis for background processing if needed
    try {
      await patientQueue.add('patient-waiting', { id, name, complaint });
    } catch (redisErr) {
      console.warn('[Queue] Redis warning (continuing with DB):', redisErr);
    }

    // Upsert in Supabase
    const { error } = await supabase
      .from('queue')
      .upsert({ 
        patient_id: id, 
        name, 
        complaint, 
        status: 'waiting', 
        created_at: new Date().toISOString() 
      }, { onConflict: 'patient_id' });

    if (error) {
      console.error('[Queue] Supabase Error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`[Queue] ${name} successfully added to queue`);
    res.json({ success: true, message: 'Adicionado à fila' });
  } catch (err: any) { 
    console.error('[Queue] Internal Error:', err);
    res.status(500).json({ error: err.message }); 
  }
});


app.get('/api/queue', authenticateToken, authorizeDoctor, async (req, res) => {
  try {
    const { data: queue, error } = await supabase.from('queue').select('*').eq('status', 'waiting').order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, queue });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/take-patient', authenticateToken, authorizeDoctor, async (req: any, res) => {
  try {
    const { doctorId } = req.body;
    if (req.user.role === 'doctor' && req.user.id !== doctorId) return res.status(403).json({ error: 'Não autorizado' });
    const { data: patient, error: fetchError } = await supabase.from('queue').select('*').eq('status', 'waiting').order('created_at', { ascending: true }).limit(1).single();
    if (fetchError || !patient) return res.status(404).json({ error: 'Fila vazia' });
    const { data: updated, error: updateError } = await supabase.from('queue').update({ status: 'in-consultation', doctor_id: doctorId }).eq('id', patient.id).select().single();
    if (updateError) return res.status(500).json({ error: updateError.message });
    res.json({ success: true, patient: { ...updated, id: updated.patient_id, roomId: updated.patient_id } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/atestado', authenticateToken, authorizeDoctor, async (req, res) => {
  try {
    const { patientId, doctorId, daysOff, cid, content } = req.body;
    const validationCode = `MP-${uuidv4().substring(0, 8).toUpperCase()}`;
    const { data: patient } = await supabase.from('patients').select('name').eq('id', patientId).single();
    const { data: doctor } = await supabase.from('doctors').select('name, crm').eq('id', doctorId).single();
    const { error } = await supabase.from('atestados').insert([{ code: validationCode, patient_id: patientId, doctor_id: doctorId, days_off: parseInt(daysOff) || 1, cid, content, patient_name: patient?.name, doctor_name: doctor?.name, doctor_crm: doctor?.crm }]);
    if (error) return res.status(500).json({ error: error.message });
    await documentQueue.add('process-atestado', { type: 'GENERATE_ATESTADO', data: { patientId, doctorId, validationCode, daysOff, cid, content } });
    res.json({ success: true, code: validationCode });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/end-consultation', authenticateToken, authorizeDoctor, async (req, res) => {
  try {
    const { patientId, doctorId, notes, prescriptions, exams, content } = req.body;
    const validationCode = `MP-R-${uuidv4().substring(0, 8).toUpperCase()}`;
    const { error: insertError } = await supabase.from('consultations').insert([{ patient_id: patientId, doctor_id: doctorId, notes, prescriptions, exams, content, validation_code: validationCode }]);
    if (insertError) return res.status(500).json({ error: insertError.message });
    await documentQueue.add('process-consultation', { type: 'GENERATE_CONSULTATION', data: { patientId, doctorId, validationCode, notes, prescriptions, exams, content } });
    await supabase.from('queue').delete().eq('patient_id', patientId);
    res.json({ success: true, message: 'Finalizado' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/patient/history/:cpf', authenticateToken, async (req: any, res) => {
  try {
    const { cpf } = req.params;
    const { data: patient } = await supabase.from('patients').select('*').eq('cpf', cpf).single();
    if (!patient) return res.status(404).json({ error: 'Não encontrado' });
    if (req.user.role === 'patient' && req.user.id !== patient.id) return res.status(403).json({ error: 'Acesso negado' });
    const { data: consultations } = await supabase.from('consultations').select('*').eq('patient_id', patient.id).order('created_at', { ascending: false });
    const { data: atestados } = await supabase.from('atestados').select('*').eq('patient_id', patient.id).order('created_at', { ascending: false });
    res.json({ success: true, patient, consultations, atestados });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/validate-document/:code', validateLimiter, async (req, res) => {
  try {
    const { code } = req.params;
    const cleanCode = (code as string).trim().toUpperCase();
    const { data: atestado } = await supabase.from('atestados').select('*').eq('code', cleanCode).single();
    if (atestado) return res.json({ success: true, type: 'ATESTADO', document: atestado });
    const { data: consultation } = await supabase.from('consultations').select('*').eq('validation_code', cleanCode).single();
    if (consultation) return res.json({ success: true, type: 'RECEITA', document: consultation });
    res.status(404).json({ error: 'Não encontrado' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/patient/check-queue/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // 1. Check if patient is in the waiting queue
    const { data: queueEntry } = await supabase.from('queue').select('*').eq('patient_id', patientId).eq('status', 'waiting').single();
    
    // 2. Check if patient has an active consultation (doctor called)
    const { data: activeConsultation } = await supabase.from('consultations').select('*').eq('patient_id', patientId).eq('status', 'active').single();

    if (activeConsultation) {
      return res.json({ isActive: true, inQueue: false, roomId: patientId });
    }
    
    if (queueEntry) {
      return res.json({ inQueue: true, isActive: false, entry: queueEntry });
    }

    res.json({ inQueue: false, isActive: false });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});


app.post('/api/payment/pix-simulate', async (req, res) => {
  try {
    const pixKey = '00020126580014BR.GOV.BCB.PIX01366366f1-med-pronto-pix-key-2026520400005303986540550.005802BR5925MEDPRONTO TELEMEDICINA6009SAO PAULO62070503***6304E2B1';
    res.json({ success: true, pixKey });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.use((req, res) => { res.status(404).json({ error: 'Não encontrado' }); });


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });
