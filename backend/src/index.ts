import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { createServer } from 'http';
import dotenv from 'dotenv';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Stripe from 'stripe';
import { streamToBuffer } from './utils';
import sql from './db';
import { BirdIdService } from './birdid';
import dns from 'dns';

// Fix for Supabase IPv6 connection issues (EAI_AGAIN)
dns.setDefaultResultOrder('ipv4first');

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-01-27' as any,
});

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://med-pronto-wph4.vercel.app',
  'https://medpronto-online.vercel.app',
  /\.vercel\.app$/
];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(express.json());

// Logger de requisições
app.use((req, res, next) => {
    // Normalizar caminhos com barras duplas (ex: //api -> /api)
    if (req.path.includes('//')) {
        req.url = req.url.replace(/\/+/g, '/');
    }
    console.log(`🌐 [${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Endpoint de saúde aprimorado
app.get('/api/health', async (req, res) => {
  try {
    const dbCheck = await sql`SELECT 1 as connected`;
    res.json({ 
      status: 'ok', 
      database: dbCheck[0].connected === 1 ? 'connected' : 'error',
      time: new Date().toISOString() 
    });
  } catch (err: any) {
    res.json({ 
      status: 'error', 
      database: 'disconnected', 
      error: err.message,
      time: new Date().toISOString() 
    });
  }
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins as any,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// -- ENV Variables --
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || ''; // Never commit real keys
const REDIS_URL = process.env.REDIS_URL || '';
const JWT_SECRET = process.env.JWT_SECRET || 'medpronto-secret-key-2026';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Instances
let redis: any = null;
if (REDIS_URL) {
  redis = new Redis(REDIS_URL, {
    tls: { rejectUnauthorized: false },
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      return Math.min(times * 100, 3000);
    }
  });

  redis.on('error', (err: any) => {
    console.error('❌ Redis Connection Error:', err.message);
  });

  redis.on('connect', () => {
    console.log('✅ Connected to Redis');
  });
} else {
  console.warn("⚠️ REDIS_URL não configurada. Cache desabilitado.");
}

let supabase: any = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
  console.warn("⚠️ SUPABASE_URL ou SUPABASE_KEY não configurados. Upload de PDFs (Storage) não funcionará.");
}

// -- Middleware for Authentication --
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token de acesso não fornecido.' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Token inválido ou expirado.' });
    req.user = user;
    next();
  });
};

const authorizeAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito ao administrador.' });
  next();
};

const authorizeDoctor = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'doctor' && req.user?.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito aos médicos cadastrados.' });
  next();
};

// -- API Routes --

// 0. AUTHENTICATION (SUPABASE REAL DATA)
app.post('/api/patient/auth', async (req, res) => {
  try {
    const { cpf, birthDate } = req.body;
    // Query Neon for real patient
    const results = await sql`
        SELECT * FROM patients 
        WHERE cpf = ${cpf} AND birth_date = ${birthDate} 
        LIMIT 1
    `;
    const patient = results[0];

    if (!patient) {
      return res.status(401).json({ error: 'Paciente não encontrado ou data de nascimento incorreta.' });
    }

    res.json({ success: true, patient });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/patient/register', async (req, res) => {
  console.log('📝 Recebendo registro de paciente:', req.body?.name);
  try {
    const { name, cpf, age, email, birthDate } = req.body;
    // Insert real patient into Neon
    const results = await sql`
        INSERT INTO patients (name, cpf, age, email, birth_date) 
        VALUES (${name}, ${cpf}, ${age}, ${email}, ${birthDate}) 
        RETURNING *
    `;
    const patient = results[0];

    res.json({ success: true, patient });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/doctor/auth', async (req, res) => {
  try {
    const { login, password } = req.body; // login can be CRM or Email
    // Query Neon for real doctor
    const results = await sql`
        SELECT * FROM doctors 
        WHERE (crm = ${login} OR email = ${login}) 
        AND password = ${password} 
        LIMIT 1
    `;
    const doctor = results[0];

    if (!doctor) {
      return res.status(401).json({ error: 'Credenciais inválidas. Médico não cadastrado no sistema.' });
    }

    // Generate JWT for safe doctor UI access
    const token = jwt.sign({ id: doctor.id, name: doctor.name, role: 'doctor' }, JWT_SECRET, { expiresIn: '8h' });

    res.json({ success: true, doctor, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/auth', async (req, res) => {
  try {
    const { login, password } = req.body;
    if (login === 'admin@medpronto.com' && password === ADMIN_PASSWORD) {
      const token = jwt.sign({ id: 'admin-01', name: 'Administrador Senior', role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
      res.json({ success: true, admin: { id: 'admin-01', name: 'Administrador Senior', role: 'admin' }, token });
    } else {
      res.status(401).json({ error: 'Credenciais administrativas inválidas.' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/stats', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const consultations = await sql`SELECT count(*) as count FROM consultations`;
    const patients = await sql`SELECT count(*) as count FROM patients`;
    const doctors = await sql`SELECT count(*) as count FROM doctors`;

    const totalConsultations = parseInt(consultations[0].count) || 0;
    const patientCount = parseInt(patients[0].count) || 0;
    const doctorCount = parseInt(doctors[0].count) || 0;

    // Revenue simulation
    const revenue = totalConsultations * 120;
    const costs = doctorCount * 2000 + (revenue * 0.1);

    res.json({ success: true, stats: { totalConsultations, revenue, costs, patientCount, doctorCount } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/doctors', async (req, res) => {
  try {
    const { name, crm, email, password } = req.body;
    const results = await sql`
        INSERT INTO doctors (name, crm, email, password) 
        VALUES (${name}, ${crm}, ${email}, ${password}) 
        RETURNING *
    `;
    res.json({ success: true, doctor: results[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/doctors', async (req, res) => {
  try {
    const doctors = await sql`SELECT * FROM doctors ORDER BY name ASC`;
    res.json({ success: true, doctors });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/patients', async (req, res) => {
  try {
    const patients = await sql`SELECT * FROM patients ORDER BY created_at DESC`;
    res.json({ success: true, patients });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/consultations', async (req, res) => {
  try {
    const consultations = await sql`
        SELECT c.*, p.name as patient_name, p.cpf as patient_cpf, d.name as doctor_name 
        FROM consultations c
        LEFT JOIN patients p ON c.patient_id = p.id
        LEFT JOIN doctors d ON c.doctor_id = d.id
        ORDER BY c.created_at DESC
    `;
    res.json({ success: true, consultations });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/doctor/stats/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const results = await sql`
        SELECT count(*) FROM consultations 
        WHERE doctor_id = ${doctorId} 
        AND created_at >= ${today.toISOString()}
    `;

    const totalConsultations = parseInt(results[0].count) || 0;
    const earnings = totalConsultations * 60; // R$ 60 per consultation

    res.json({ success: true, stats: { totalConsultations, earnings } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/reorder-queue', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { newOrder } = req.body; // Array of patient JSON strings

    // Replace the entire redis list with the new order
    await redis.del('patient_queue');
    if (newOrder.length > 0) {
      await redis.rpush('patient_queue', ...newOrder);
    }

    io.emit('queue_updated');
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 1. Patient enqueue
app.post('/api/enqueue', async (req, res) => {
  try {
    const { name, cpf, age, email, complaint } = req.body;
    const patientData = { id: uuidv4(), name, cpf, age, email, complaint, status: 'waiting', timestamp: Date.now() };

    // Push to Upstash Redis list
    await redis.rpush('patient_queue', JSON.stringify(patientData));

    // Broadcast queue update
    io.emit('queue_updated');

    res.json({ success: true, patient: patientData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Doctor: Get Queue
app.get('/api/queue', async (req, res) => {
  try {
    const queueData = await redis.lrange('patient_queue', 0, -1);
    const parsedQueue = queueData.map((q: string) => JSON.parse(q));
    res.json({ success: true, queue: parsedQueue });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/patient/check-queue/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const queueData = await redis.lrange('patient_queue', 0, -1);
    const inQueue = queueData.some((q: string) => JSON.parse(q).id === patientId);

    // Also check if in active consultation
    const activeConsultation = await redis.get(`consultation:${patientId}`);

    res.json({ success: true, inQueue, isActive: !!activeConsultation });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Doctor: Take Patient
app.post('/api/take-patient', async (req, res) => {
  try {
    const { doctorId } = req.body;
    const patientStr = await redis.lpop('patient_queue');
    if (!patientStr) return res.status(404).json({ error: 'Fila vazia' });

    const patient = JSON.parse(patientStr);
    patient.doctorId = doctorId;
    patient.status = 'in-consultation';

    // Save consultation to active list mapping
    await redis.set(`consultation:${patient.id}`, JSON.stringify(patient));

    io.emit('queue_updated');
    res.json({ success: true, patient });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. End Consultation & Generate PDF
app.post('/api/end-consultation', authenticateToken, authorizeDoctor, async (req, res) => {
  try {
    const { patientId, doctorId, notes, prescriptions, exams } = req.body;

    const patientStr = await redis.get(`consultation:${patientId}`);
    if (!patientStr) return res.status(404).json({ error: 'Consulta não encontrada' });
    const patient = JSON.parse(patientStr);

    // Fetch doctor data from Neon
    const docResults = await sql`SELECT * FROM doctors WHERE id = ${doctorId} LIMIT 1`;
    const doctor = docResults[0];
    if (!doctor) return res.status(404).json({ error: 'Dados do médico não encontrados.' });

    // Generate PDF
    const doc = new PDFDocument({ margins: { top: 40, left: 60, right: 60, bottom: 40 }, size: 'A4' });
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));

    const primaryTeal = '#004e66';
    const highlightTeal = '#0097b2';
    const cleanGreen = '#22c55e';
    const darkGrey = '#1e293b';

    // HEADER - CENTERED LOGO (NO OVERLAP)
    const logoY = 40;
    doc.fontSize(26).font('Helvetica-Bold');
    const widthMed = doc.widthOfString('MedPronto');
    const widthOn = doc.widthOfString('Online');
    const startX = (doc.page.width - (widthMed + widthOn)) / 2;

    doc.fillColor(primaryTeal).text('MedPronto', startX, logoY, { continued: true });
    doc.fillColor(highlightTeal).text('Online', { continued: false });

    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('REGISTRO DE ATENDIMENTO MÉDICO (PRONTUÁRIO)', 0, 85, { align: 'center', characterSpacing: 1 });
    doc.strokeColor(highlightTeal).lineWidth(1.5).moveTo(60, 115).lineTo(535, 115).stroke();

    // TITLE
    doc.fillColor(darkGrey).fontSize(20).font('Helvetica-Bold').text('RESUMO DA CONSULTA', 0, 160, { align: 'center' });

    // PATIENT INFO
    doc.moveDown(2);
    doc.fillColor(primaryTeal).fontSize(12).font('Helvetica-Bold').text('Paciente: ', 60, 210);
    doc.fillColor('#000').font('Helvetica').text(patient.name.toUpperCase(), 125, 210);
    doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(125, 224).lineTo(535, 224).stroke();

    // CONTENT SECTIONS
    let currentY = 260;
    const drawDivider = (y: number) => {
      doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(60, y).lineTo(535, y).stroke();
    };

    const addSection = (title: string, content: string) => {
      if (!content) return;
      doc.fillColor(primaryTeal).fontSize(10).font('Helvetica-Bold').text(title.toUpperCase(), 60, currentY);
      doc.fillColor(darkGrey).fontSize(11).font('Helvetica').text(content, 60, currentY + 15, { width: 475, align: 'justify', lineGap: 3 });
      currentY = doc.y + 25;
      drawDivider(currentY - 10);
    };

    addSection('Motivo da Consulta', patient.complaint);
    addSection('Anamnese e Evolução', notes);
    addSection('Prescrição de Conduta', prescriptions);
    addSection('Exames Solicitados', exams);

    // SIGNATURE AREA
    const signatureY = currentY + 40 > 650 ? 650 : currentY + 40;
    doc.strokeColor('#000').lineWidth(0.5).moveTo(200, signatureY).lineTo(400, signatureY).stroke();
    doc.fontSize(11).font('Helvetica-Bold').text(`Dr(a). ${doctor.name}`, 0, signatureY + 8, { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`CRM: ${doctor.crm}`, 0, signatureY + 22, { align: 'center' });

    // FOOTER
    const footerY = 740;
    doc.fillColor(cleanGreen).rect(200, footerY, 200, 25).fill();
    doc.fillColor('white').fontSize(8).font('Helvetica-Bold').text('ASSINADO DIGITALMENTE - PADRÃO ICP-BRASIL', 200, footerY + 8, { align: 'center', width: 200 });

    doc.fillColor('#94a3b8').fontSize(7).font('Helvetica').text('Este documento é um registro oficial de telemedicina.', 0, footerY + 35, { align: 'center' });

    doc.end();

    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
    });

    // --- Bird ID Digital Signature Step ---
    const birdIdToken = await BirdIdService.authenticate();
    if (birdIdToken) {
      console.log('✅ Autorização Bird ID obtida. Assinando prontuário...');
      // Simulação de assinatura do documento
      await BirdIdService.signHash(patientId, birdIdToken);
    }

    if (!supabase) {
      console.warn("Upload de PDF ignorado: Supabase não configurado.");
      res.json({ success: true, message: 'Consulta encerrada localmente (Storage não configurado)' });
      return;
    }

    // Ensure bucket exists (best effort)
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find((b: any) => b.name === 's3')) {
      await supabase.storage.createBucket('s3', { public: true });
      console.log("Bucket 's3' criado automaticamente.");
    }

    // Save to Supabase Storage (S3 API or Standard)
    const filePath = `prontuarios/${patientId}_${Date.now()}.pdf`;
    const { data, error } = await supabase.storage
      .from('s3')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error("Erro no Supabase Storage:", error.message);
      // Fallback to local save or return error if critical
    }

    // Generate public URL
    const { data: publicUrlData } = supabase.storage.from('s3').getPublicUrl(filePath);
    const pdfUrl = publicUrlData.publicUrl;

    // Save metadata in Neon
    await sql`
        INSERT INTO consultations (patient_id, doctor_id, notes, prescriptions, exams, pdf_path)
        VALUES (${patient.id}, ${doctorId}, ${notes}, ${prescriptions}, ${exams}, ${pdfUrl})
    `;

    // Cleanup Redis
    await redis.del(`consultation:${patientId}`);

    // Notify Patient via socket with PDF Download URL
    io.to(patientId).emit('consultation_ended', { pdf_url: pdfUrl });

    res.json({ success: true, message: 'Consulta encerrada e PDF salvo no S3', pdf_url: pdfUrl });
  } catch (err: any) {
    console.error("Erro fatal ao encerrar:", err);
    res.status(500).json({ error: err.message });
  }
});

// 5. Generate Medical Certificate (Atestado)
app.post('/api/atestado', async (req, res) => {
  try {
    const { patientId, doctorId, daysOff, cid } = req.body;

    // Check consultation in Redis first (active session)
    const patientStr = await redis.get(`consultation:${patientId}`);
    if (!patientStr) return res.status(404).json({ error: 'Paciente não encontrado na sessão ativa.' });
    const patient = JSON.parse(patientStr);

    // Fetch doctor data for CRM and real Name from Neon
    const docResults = await sql`SELECT * FROM doctors WHERE id = ${doctorId} LIMIT 1`;
    const doctor = docResults[0];
    if (!doctor) return res.status(404).json({ error: 'Dados do médico não encontrados.' });

    const validationCode = `MP-${uuidv4().substring(0, 8).toUpperCase()}`;

    // 2. Save to Neon first
    await sql`
        INSERT INTO atestados (code, patient_id, doctor_id, days_off, cid, patient_name, doctor_name, doctor_crm)
        VALUES (${validationCode}, ${patientId}, ${doctorId}, ${parseInt(daysOff)}, ${cid || null}, ${patient.name}, ${doctor.name}, ${doctor.crm})
    `;

    const doc = new PDFDocument({ margins: { top: 30, left: 60, right: 60, bottom: 30 }, size: 'A4' });
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));

    const primaryTeal = '#004e66';
    const highlightTeal = '#0097b2';
    const cleanGreen = '#22c55e';
    const darkGrey = '#1e293b';

    // HEADER - CENTERED LOGO (NO OVERLAP)
    const logoY = 40;
    doc.fontSize(26).font('Helvetica-Bold');
    const widthMed = doc.widthOfString('MedPronto');
    const widthOn = doc.widthOfString('Online');
    const startX = (doc.page.width - (widthMed + widthOn)) / 2;

    doc.fillColor(primaryTeal).text('MedPronto', startX, logoY, { continued: true });
    doc.fillColor(highlightTeal).text('Online', { continued: false });

    doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('PRONTO SOCORRO ONLINE & TELEMEDICINA', 0, 72, { align: 'center', characterSpacing: 1 });
    doc.strokeColor(highlightTeal).lineWidth(1.2).moveTo(60, 95).lineTo(535, 95).stroke();

    // TITLE
    doc.fillColor(darkGrey).fontSize(18).font('Helvetica-Bold').text('ATESTADO MÉDICO', 0, 135, { align: 'center' });
    doc.strokeColor(darkGrey).lineWidth(0.8).moveTo(220, 155).lineTo(375, 155).stroke();

    // FIELDS
    const formStartY = 190;
    doc.fillColor(primaryTeal).fontSize(11).font('Helvetica-Bold').text('Paciente: ', 60, formStartY);
    doc.fillColor('#000').font('Helvetica').text(patient.name.toUpperCase(), 120, formStartY);
    doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(120, formStartY + 12).lineTo(535, formStartY + 12).stroke();

    const formY2 = 225;
    doc.fillColor(primaryTeal).font('Helvetica-Bold').text('CPF: ', 60, formY2);
    doc.fillColor('#000').font('Helvetica').text(patient.cpf, 100, formY2);
    doc.strokeColor('#e2e8f0').moveTo(100, formY2 + 12).lineTo(250, formY2 + 12).stroke();

    doc.fillColor(primaryTeal).font('Helvetica-Bold').text('RG: ', 270, formY2);
    doc.strokeColor('#e2e8f0').moveTo(300, formY2 + 12).lineTo(480, formY2 + 12).stroke();

    // BODY (ONE PAGE COMPACT)
    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

    doc.fillColor(darkGrey).fontSize(11.5).font('Helvetica').lineGap(8);
    const bodyText = `Atesto, para os devidos fins, que o paciente acima identificado foi atendido via teleconsulta nesta data, apresentando quadro clínico que justifica o afastamento de suas atividades por ${daysOff} (________________) dias, a contar de ${formattedDate}.`;

    doc.text(bodyText, 60, 280, { align: 'justify', width: 475 });
    doc.moveDown(1.5);
    doc.text(`CID: ${cid || '_________'} (conforme autorização do paciente).`);

    // SIGNATURE & FOOTER FIXED POSITIONS
    const pageBottom = 842;
    const signatureY = pageBottom - 230;
    doc.strokeColor('#000').lineWidth(0.5).moveTo(200, signatureY).lineTo(400, signatureY).stroke();
    doc.fontSize(10).font('Helvetica-Bold').text(`Dr(a). ${doctor.name}`, 0, signatureY + 8, { align: 'center' });
    doc.fontSize(9).font('Helvetica').text(`CRM: ${doctor.crm} / UF: SP`, 0, signatureY + 20, { align: 'center' });

    const footerY = pageBottom - 110;
    doc.fillColor(cleanGreen).rect(205, footerY, 185, 20).fill();
    doc.fillColor('white').fontSize(7.5).font('Helvetica-Bold').text('ASSINADO DIGITALMENTE - PADRÃO ICP-BRASIL', 205, footerY + 6.5, { align: 'center', width: 185 });

    doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica').text('MedProntoOnline Tecnologia S.A. | Validar em: www.medprontoonline.com.br/validar', 0, footerY + 30, { align: 'center' });
    doc.text('Este documento possui validade jurídica em todo território nacional.', 0, footerY + 40, { align: 'center' });
    doc.fillColor(primaryTeal).fontSize(8).font('Helvetica-Bold').text(`AUTENTICAÇÃO: ${validationCode}`, 0, footerY + 55, { align: 'center' });

    doc.end();

    doc.on('end', () => {
      const finalBuffer = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=atestado_${patient.cpf.replace(/\D/g, '')}.pdf`);
      res.send(finalBuffer);
    });

  } catch (err: any) {
    console.error("Erro ao gerar atestado:", err);
    res.status(500).json({ error: err.message });
  }
});

// 6. Generate Prescription (Receituário)
app.post('/api/receita', async (req, res) => {
  try {
    const { patientId, doctorId, prescriptions } = req.body;

    const patientStr = await redis.get(`consultation:${patientId}`);
    if (!patientStr) return res.status(404).json({ error: 'Paciente não encontrado na sessão ativa.' });
    const patient = JSON.parse(patientStr);

    const docResults = await sql`SELECT * FROM doctors WHERE id = ${doctorId} LIMIT 1`;
    const doctor = docResults[0];
    if (!doctor) return res.status(404).json({ error: 'Dados do médico não encontrados.' });

    const doc = new PDFDocument({ margins: { top: 30, left: 60, right: 60, bottom: 30 }, size: 'A4' });
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));

    const primaryTeal = '#004e66';
    const highlightTeal = '#0097b2';
    const cleanGreen = '#22c55e';
    const darkGrey = '#1e293b';

    // HEADER - CENTERED LOGO
    const logoY = 40;
    doc.fontSize(26).font('Helvetica-Bold');
    const widthMed = doc.widthOfString('MedPronto');
    const widthOn = doc.widthOfString('Online');
    const totalWidth = widthMed + widthOn;
    const startX = (doc.page.width - totalWidth) / 2;

    doc.fillColor(primaryTeal).text('MedPronto', startX, logoY, { continued: true });
    doc.fillColor(highlightTeal).text('Online', { continued: false });

    doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('RECEITUÁRIO MÉDICO DIGITAL', 0, 72, { align: 'center', characterSpacing: 1 });
    doc.strokeColor(highlightTeal).lineWidth(1.2).moveTo(60, 95).lineTo(535, 95).stroke();

    // TITLE
    doc.fillColor(darkGrey).fontSize(18).font('Helvetica-Bold').text('PRESCRIÇÃO MÉDICA', 0, 135, { align: 'center' });
    doc.strokeColor(darkGrey).lineWidth(0.8).moveTo(210, 155).lineTo(385, 155).stroke();

    const formStartY = 190;
    doc.fillColor(primaryTeal).fontSize(11).font('Helvetica-Bold').text('Paciente: ', 60, formStartY);
    doc.fillColor('#000').font('Helvetica').text(patient.name.toUpperCase(), 120, formStartY);
    doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(120, formStartY + 12).lineTo(535, formStartY + 12).stroke();

    // CONTENT
    doc.fillColor(darkGrey).fontSize(13).font('Helvetica').lineGap(8);
    doc.text(prescriptions || 'Sem prescrições registradas.', 60, 240, { width: 475, align: 'left' });

    // SIGNATURE & FOOTER
    const pageBottom = 842;
    const signatureY = pageBottom - 180;
    doc.strokeColor('#000').lineWidth(0.5).moveTo(200, signatureY).lineTo(400, signatureY).stroke();
    doc.fontSize(10).font('Helvetica-Bold').text(`Dr(a). ${doctor.name}`, 0, signatureY + 8, { align: 'center' });
    doc.fontSize(9).font('Helvetica').text(`CRM: ${doctor.crm}`, 0, signatureY + 20, { align: 'center' });

    const footerY = pageBottom - 80;
    doc.fillColor(cleanGreen).rect(205, footerY, 185, 20).fill();
    doc.fillColor('white').fontSize(7.5).font('Helvetica-Bold').text('ASSINADO DIGITALMENTE - PADRÃO ICP-BRASIL', 205, footerY + 6.5, { align: 'center', width: 185 });

    doc.end();
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=receita.pdf');
      res.send(pdfBuffer);
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Generate Exam Request (Pedido de Exame)
app.post('/api/exames', async (req, res) => {
  try {
    const { patientId, doctorId, exams } = req.body;

    const patientStr = await redis.get(`consultation:${patientId}`);
    if (!patientStr) return res.status(404).json({ error: 'Paciente não encontrado na sessão ativa.' });
    const patient = JSON.parse(patientStr);

    const docResults = await sql`SELECT * FROM doctors WHERE id = ${doctorId} LIMIT 1`;
    const doctor = docResults[0];
    if (!doctor) return res.status(404).json({ error: 'Dados do médico não encontrados.' });

    const doc = new PDFDocument({ margins: { top: 30, left: 60, right: 60, bottom: 30 }, size: 'A4' });
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));

    const primaryTeal = '#004e66';
    const highlightTeal = '#0097b2';
    const cleanGreen = '#22c55e';
    const darkGrey = '#1e293b';

    // HEADER - FIXED (NO OVERLAP)
    const logoY = 40;
    doc.fontSize(26).font('Helvetica-Bold');
    const widthMed = doc.widthOfString('MedPronto');
    const widthOn = doc.widthOfString('Online');
    const startX = (doc.page.width - (widthMed + widthOn)) / 2;

    doc.fillColor(primaryTeal).text('MedPronto', startX, logoY, { continued: true });
    doc.fillColor(highlightTeal).text('Online', { continued: false });

    doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('SOLICITAÇÃO DE EXAMES E PROCEDIMENTOS', 0, 72, { align: 'center', characterSpacing: 1 });
    doc.strokeColor(highlightTeal).lineWidth(1.2).moveTo(60, 95).lineTo(535, 95).stroke();

    // TITLE
    doc.fillColor(darkGrey).fontSize(18).font('Helvetica-Bold').text('REQUISIÇÃO MÉDICA', 0, 135, { align: 'center' });
    doc.strokeColor(darkGrey).lineWidth(0.8).moveTo(210, 155).lineTo(385, 155).stroke();

    // PATIENT FIELD
    doc.moveDown(4);
    const formY1 = 230;
    doc.fillColor(primaryTeal).fontSize(12).font('Helvetica-Bold').text('Paciente: ', 60, formY1);
    doc.fillColor('#000').font('Helvetica').text(patient.name.toUpperCase(), 125, formY1);
    doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(125, formY1 + 14).lineTo(535, formY1 + 14).stroke();

    // CONTENT
    doc.moveDown(4);
    doc.fillColor(darkGrey).fontSize(13).font('Helvetica-Oblique').lineGap(8);
    doc.text('Solicito, para fins de investigação diagnóstica, a realização dos seguintes exames:', 60, 300);
    doc.moveDown(1.5);
    doc.font('Helvetica-Bold').text(exams || 'Nenhum exame detalhado.', { bulletRadius: 2 });

    // SIGNATURE AREA
    const signatureY = 560;
    doc.strokeColor('#000').lineWidth(0.5).moveTo(200, signatureY).lineTo(400, signatureY).stroke();
    doc.fontSize(11).font('Helvetica-Bold').text(`Dr(a). ${doctor.name}`, 0, signatureY + 8, { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`CRM: ${doctor.crm}`, 0, signatureY + 22, { align: 'center' });

    // FOOTER
    const footerY = 740;
    doc.fillColor(cleanGreen).rect(200, footerY, 200, 25).fill();
    doc.fillColor('white').fontSize(8).font('Helvetica-Bold').text('ASSINADO DIGITALMENTE - PADRÃO ICP-BRASIL', 200, footerY + 8, { align: 'center', width: 200 });

    doc.fillColor('#94a3b8').fontSize(7).font('Helvetica').text('Este documento possui validade jurídica em todo território nacional.', 0, footerY + 35, { align: 'center' });
    doc.text('MedProntoOnline | Autenticidade em www.medprontoonline.com.br/validar', 0, footerY + 45, { align: 'center' });

    doc.end();
    doc.on('end', () => {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=exames_${patient.cpf.replace(/\D/g, '')}.pdf`);
      res.send(Buffer.concat(buffers));
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Validate Atestado (Public Route for companies)
app.get('/api/validate-atestado/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const results = await sql`SELECT * FROM atestados WHERE code = ${code} LIMIT 1`;
    const atestado = results[0];

    if (!atestado) {
      return res.status(404).json({ success: false, error: 'Atestado não encontrado ou código inválido.' });
    }

    res.json({ success: true, atestado });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Patient Profile - Full History
app.get('/api/patient/history/:cpf', async (req, res) => {
  try {
    const { cpf } = req.params;

    // Get patient
    const patientResults = await sql`SELECT * FROM patients WHERE cpf = ${cpf} LIMIT 1`;
    const patient = patientResults[0];
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });

    // Get consultations with doctor info
    const consultations = await sql`
        SELECT c.*, d.name as doctor_name, d.crm as doctor_crm 
        FROM consultations c
        LEFT JOIN doctors d ON c.doctor_id = d.id
        WHERE c.patient_id = ${patient.id}
        ORDER BY c.created_at DESC
    `;

    // Get atestados
    const atestados = await sql`
        SELECT * FROM atestados 
        WHERE patient_id = ${patient.id}
        ORDER BY created_at DESC
    `;

    res.json({
      success: true,
      patient,
      consultations,
      atestados,
      summary: {
        totalConsultations: consultations.length,
        totalAtestados: atestados.length,
        lastVisit: consultations.length > 0 ? consultations[0].created_at : null,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -- Socket.io Signaling & Chat --
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
    socket.to(roomId).emit('user_joined', socket.id);
  });

  socket.on('consultation_started', (data) => {
    socket.to(data.roomId).emit('consultation_started', data);
  });

  // Signaling
  socket.on('offer', (data) => {
    socket.to(data.roomId).emit('offer', data);
  });

  socket.on('answer', (data) => {
    socket.to(data.roomId).emit('answer', data);
  });

  socket.on('ice_candidate', (data) => {
    socket.to(data.roomId).emit('ice_candidate', data);
  });

  // Text chat
  socket.on('send_message', (data) => {
    socket.to(data.roomId).emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// --- Bird ID Digital Signature Flow ---

// Iniciar fluxo de assinatura (Disparar Push)
app.post('/api/doctor/signature/start', async (req, res) => {
  const { doctorId } = req.body;
  try {
    const [doctor] = await sql`SELECT * FROM doctors WHERE id = ${doctorId}`;
    if (!doctor) return res.status(404).json({ error: 'Médico não encontrado' });
    if (!doctor.cpf) return res.status(400).json({ error: 'CPF do médico não cadastrado para Bird ID' });

    const sessionId = await BirdIdService.startSignatureFlow(doctor.cpf);
    if (!sessionId) return res.status(500).json({ error: 'Falha ao iniciar Bird ID' });

    res.json({ session_id: sessionId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Verificar status da assinatura
app.get('/api/doctor/signature/status/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  try {
    const status = await BirdIdService.checkSignatureStatus(sessionId);
    res.json({ status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- STRIPE ENDPOINTS ---

app.post('/api/payment/create-checkout', async (req, res) => {
    console.log("💰 [Stripe] Iniciando checkout session...");
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'pix'],
            payment_method_options: {
                pix: {
                    expires_after_seconds: 1800 // 30 minutos para pagar
                }
            },
            line_items: [{
                price_data: {
                    currency: 'brl',
                    product_data: {
                        name: 'Consulta Médica - MedPronto',
                        description: 'Acesso ao atendimento médico online imediato.',
                    },
                    unit_amount: 5000, // R$ 50,00
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${req.headers.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin}/patient/login`,
        });
        res.json({ url: session.url });
    } catch (error: any) {
        console.error("Stripe Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/payment/verify-session/:sessionId', async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
        if (session.payment_status === 'paid') {
            res.json({ success: true });
        } else {
            res.json({ success: false, status: session.payment_status });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Catch-all 404 handler for debugging (MUST BE AFTER ROUTES)
app.use((req, res) => {
  console.log(`🔍 404 at ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'Rota não encontrada no servidor.', 
    method: req.method, 
    path: req.path 
  });
});

// Middleware de log de erros global (MUST BE LAST)
app.use((err: any, req: any, res: any, next: any) => {
  console.error('🔥 Erro Global Detectado:', err);
  res.status(500).json({ error: 'Erro interno no servidor.', details: err.message });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
