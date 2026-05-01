import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { streamToBuffer } from './utils';
import sql from './db';
import { BirdIdService } from './birdid';
import { PDFTemplate } from './PDFTemplate';
import { config } from './config';
import dns from 'dns';
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { patientQueue, documentQueue } from './queue';


// Fix for Supabase IPv6 connection issues (EAI_AGAIN)
dns.setDefaultResultOrder('ipv4first');

dotenv.config();

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://med-pronto-wph4.vercel.app',
  'https://medpronto-online.vercel.app',
  /\.vercel\.app$/
];

app.use(helmet()); // Adiciona cabeçalhos de segurança básicos
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(express.json());

// Configuração de Rate Limit para prevenir ataques de força bruta
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // Limite de 20 tentativas por IP por janela
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

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

// -- Config --
const { supabaseUrl, supabaseKey, jwtSecret, adminPassword, s3 } = config;

let supabase: any = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

const s3Client = new S3Client({
  endpoint: s3.endpoint,
  region: s3.region,
  credentials: {
    accessKeyId: s3.accessKey,
    secretAccessKey: s3.secretKey
  },
  forcePathStyle: true
});

async function uploadPDF(bucketName: string, filePath: string, body: Buffer) {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: filePath,
    Body: body,
    ContentType: 'application/pdf',
    ACL: 'private' // Alterado para privado
  });
  await s3Client.send(command);
  
  // Retorna apenas a chave do arquivo para ser salva no banco e usada para gerar Signed URLs
  return filePath;
}

// -- Middleware for Authentication --
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token de acesso não fornecido.' });

  jwt.verify(token, jwtSecret, (err: any, user: any) => {
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
app.post('/api/patient/auth', authLimiter, async (req, res) => {
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

    const token = jwt.sign({ id: patient.id, name: patient.name, role: 'patient' }, jwtSecret, { expiresIn: '24h' });

    res.json({ success: true, patient, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/patient/register', authLimiter, async (req, res) => {
  console.log('📝 Recebendo registro de paciente:', req.body?.name);
  try {
    const { name, cpf, age, email, birthDate } = req.body;
    
    // Check if patient already exists by CPF
    const existingPatient = await sql`SELECT * FROM patients WHERE cpf = ${cpf} LIMIT 1`;
    if (existingPatient[0]) {
      return res.status(409).json({ 
        error: 'Este CPF já está cadastrado em nosso sistema.', 
        suggestion: 'login' 
      });
    }

    // Insert real patient into Neon
    const results = await sql`
        INSERT INTO patients (name, cpf, age, email, birth_date) 
        VALUES (${name}, ${cpf}, ${age}, ${email}, ${birthDate}) 
        RETURNING *
    `;
    const patient = results[0];
    const token = jwt.sign({ id: patient.id, name: patient.name, role: 'patient' }, jwtSecret, { expiresIn: '24h' });

    res.json({ success: true, patient, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/doctor/auth', authLimiter, async (req, res) => {
  try {
    const { login, password } = req.body; // login can be CRM or Email
    // Query Neon for real doctor
    const results = await sql`
        SELECT * FROM doctors 
        WHERE (crm = ${login} OR email = ${login}) 
        LIMIT 1
    `;
    const doctor = results[0];

    if (!doctor || !doctor.password) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const isPasswordCorrect = await bcrypt.compare(password, doctor.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    // Generate JWT for safe doctor UI access
    const token = jwt.sign({ id: doctor.id, name: doctor.name, role: 'doctor' }, jwtSecret, { expiresIn: '8h' });

    res.json({ success: true, doctor, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/auth', async (req, res) => {
  try {
    const { login, password } = req.body;
    if (login === 'admin@medpronto.com' && password === adminPassword) {
      const token = jwt.sign({ id: 'admin-01', name: 'Administrador Senior', role: 'admin' }, jwtSecret, { expiresIn: '12h' });
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

    // Fixed Revenue Split: R$ 50 total (R$ 25 Doctor / R$ 25 Site)
    const revenue = totalConsultations * 50;
    const costs = totalConsultations * 25; // Paid to doctors
    const profit = totalConsultations * 25; // Net for site

    res.json({ success: true, stats: { totalConsultations, revenue, costs, profit, patientCount, doctorCount } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/doctors', authenticateToken, authorizeAdmin, authLimiter, async (req, res) => {
  try {
    const { name, crm, cpf, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const results = await sql`
        INSERT INTO doctors (name, crm, cpf, email, password) 
        VALUES (${name}, ${crm}, ${cpf}, ${email}, ${hashedPassword}) 
        RETURNING *
    `;
    const doctor = results[0];
    if (doctor) delete doctor.password;
    res.json({ success: true, doctor });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/doctors', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const doctors = await sql`SELECT id, name, crm, email, created_at FROM doctors ORDER BY name ASC`;
    res.json({ success: true, doctors });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/patients', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const patients = await sql`SELECT * FROM patients ORDER BY created_at DESC`;
    res.json({ success: true, patients });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/consultations', authenticateToken, authorizeAdmin, async (req, res) => {
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

app.get('/api/doctor/stats/:doctorId', authenticateToken, authorizeDoctor, async (req, res) => {
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
    const earnings = totalConsultations * 25; // R$ 25 per consultation (split 50/50 with site)

    res.json({ success: true, stats: { totalConsultations, earnings } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/reorder-queue', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    res.status(501).json({ error: 'Not implemented for SQL queue' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -- Payment Simulation --
app.post('/api/payment/pix-simulate', async (req, res) => {
  try {
    const { patientId } = req.body;
    // In a real scenario, we'd check gateway status. 
    // Here we just return a success bit for the simulated flow.
    const pixKey = "00020126580014BR.GOV.BCB.PIX0136medpronto-pix-key-simulado-2026520400005303986540550.005802BR5915MEDPRONTO SAUDE6008BRASILIA62070503***6304D1B2";
    res.json({ success: true, pixKey, amount: 50.00 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 1. Patient enqueue (using BullMQ)
app.post('/api/enqueue', async (req, res) => {
  try {
    const { id, name, complaint } = req.body;
    
    // Add to Redis Queue via BullMQ
    await patientQueue.add('patient-waiting', { id, name, complaint });

    // Sync with SQL for persistence/history if needed, 
    // but for active queue we rely on Redis
    await sql`
      INSERT INTO queue (patient_id, name, complaint, status)
      VALUES (${id}, ${name}, ${complaint}, 'waiting')
      ON CONFLICT (patient_id) DO UPDATE SET status = 'waiting', created_at = NOW()
    `;

    // Broadcast queue update
    io.emit('queue_updated');

    res.json({ success: true, message: 'Adicionado à fila' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// 2. Doctor: Get Queue
app.get('/api/queue', async (req, res) => {
  try {
    const queue = await sql`
      SELECT * FROM queue 
      WHERE status = 'waiting' 
      ORDER BY created_at ASC
    `;
    res.json({ success: true, queue });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/patient/check-queue/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const [q] = await sql`
      SELECT status FROM queue 
      WHERE patient_id = ${patientId} 
      LIMIT 1
    `;

    res.json({ 
      success: true, 
      inQueue: q?.status === 'waiting', 
      isActive: q?.status === 'in-consultation' 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Doctor: Take Patient (using BullMQ / Atomic SQL)
app.post('/api/take-patient', async (req, res) => {
  try {
    const { doctorId } = req.body;

    // Atomic update to take the oldest waiting patient
    const [patient] = await sql`
      UPDATE queue 
      SET status = 'in-consultation', doctor_id = ${doctorId}
      WHERE id = (
        SELECT id FROM queue 
        WHERE status = 'waiting' 
        ORDER BY created_at ASC 
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `;

    if (!patient) return res.status(404).json({ error: 'Fila vazia' });

    // Remove from BullMQ active queue if we were using it for "waiting" state exclusively
    // (BullMQ jobs are usually processed by workers, but here we use SQL as the "source of truth" 
    // for complex state transitions while Redis handles the "speed" of notifications)
    
    io.emit('queue_updated');
    res.json({ success: true, patient: { ...patient, id: patient.patient_id, roomId: patient.patient_id } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// 4. End Consultation & Save Digital Content
app.post('/api/end-consultation', authenticateToken, authorizeDoctor, async (req, res) => {
  try {
    const { patientId, doctorId, notes, prescriptions, exams, content } = req.body;

    const [patient] = await sql`
        SELECT q.*, p.cpf, p.birth_date 
        FROM queue q
        JOIN patients p ON q.patient_id = p.id
        WHERE q.patient_id = ${patientId} 
        LIMIT 1
    `;
    if (!patient) return res.status(404).json({ error: 'Consulta não encontrada' });

     const validationCode = `MP-R-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Save metadata and content in DB immediately
    await sql`
        INSERT INTO consultations (patient_id, doctor_id, notes, prescriptions, exams, content, validation_code)
        VALUES (${patient.patient_id}, ${doctorId}, ${notes}, ${prescriptions}, ${exams}, ${content}, ${validationCode})
    `;

    // Offload PDF generation to background worker
    await documentQueue.add('generate-consultation-pdf', {
      type: 'CONSULTATION',
      patientId,
      doctorId,
      notes,
      prescriptions,
      exams,
      validationCode
    });

    // Finalize: Remove from DB Queue
    await sql`DELETE FROM queue WHERE patient_id = ${patientId}`;

    // Notify Patient via socket
    io.to(patientId).emit('consultation_ended', { success: true });

    res.json({ success: true, message: 'Atendimento finalizado com sucesso.' });
  } catch (err: any) {
    console.error("Erro fatal ao encerrar:", err);
    res.status(500).json({ error: err.message });
  }
});


// 5. Generate Medical Certificate (Digital First)
app.post('/api/atestado', authenticateToken, authorizeDoctor, async (req, res) => {
  try {
    const { patientId, doctorId, daysOff, cid, content } = req.body;

    const [patient] = await sql`
        SELECT q.*, p.cpf, p.birth_date 
        FROM queue q
        JOIN patients p ON q.patient_id = p.id
        WHERE q.patient_id = ${patientId} 
        LIMIT 1
    `;
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado na sessão ativa.' });

    const [doctor] = await sql`SELECT * FROM doctors WHERE id = ${doctorId} LIMIT 1`;
    if (!doctor) return res.status(404).json({ error: 'Dados do médico não encontrados.' });

    const validationCode = `MP-${uuidv4().substring(0, 8).toUpperCase()}`;
    const days = parseInt(daysOff) || 1;

    // Save to DB (Digital History)
    await sql`
        INSERT INTO atestados (code, patient_id, doctor_id, days_off, cid, content, patient_name, doctor_name, doctor_crm)
        VALUES (${validationCode}, ${patientId}, ${doctorId}, ${days}, ${cid || null}, ${content}, ${patient.name}, ${doctor.name}, ${doctor.crm})
    `;

    // Add background task for PDF and Signing
    await documentQueue.add('process-atestado', {
      type: 'ATESTADO',
      patientId,
      doctorId,
      validationCode,
      daysOff: days,
      cid,
      content
    });

    res.json({ success: true, code: validationCode, message: 'Atestado emitido e salvo no histórico.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Unified Document Validation
app.get('/api/validate-document/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const cleanCode = code.trim().toUpperCase();

    // 1. Try Atestados
    const [atestado] = await sql`
        SELECT a.*, p.name as patient_name, d.name as doctor_name, d.crm as doctor_crm
        FROM atestados a
        JOIN patients p ON a.patient_id = p.id
        JOIN doctors d ON a.doctor_id = d.id
        WHERE a.code = ${cleanCode}
        LIMIT 1
    `;

    if (atestado) {
      return res.json({ 
        success: true, 
        type: 'ATESTADO',
        document: {
          patientName: atestado.patient_name,
          doctorName: atestado.doctor_name,
          doctorCrm: atestado.doctor_crm,
          date: atestado.created_at,
          details: `Atestado de ${atestado.days_off} dia(s). CID: ${atestado.cid || 'N/A'}`
        }
      });
    }

    // 2. Try Consultations (Prescriptions)
    const [consultation] = await sql`
        SELECT c.*, p.name as patient_name, d.name as doctor_name, d.crm as doctor_crm
        FROM consultations c
        JOIN patients p ON c.patient_id = p.id
        JOIN doctors d ON c.doctor_id = d.id
        WHERE c.validation_code = ${cleanCode}
        LIMIT 1
    `;

    if (consultation) {
      return res.json({ 
        success: true, 
        type: 'RECEITA / PRONTUÁRIO',
        document: {
          patientName: consultation.patient_name,
          doctorName: consultation.doctor_name,
          doctorCrm: consultation.doctor_crm,
          date: consultation.created_at,
          details: `Prescrições: ${consultation.prescriptions}\nExames: ${consultation.exams || 'Nenhum'}`
        }
      });
    }

    res.status(404).json({ error: 'Documento não encontrado ou código inválido.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// 7. Generate Signed URL for S3 Documents
app.post('/api/documents/signed-url', authenticateToken, async (req: any, res: any) => {
  try {
    const { key } = req.body;
    if (!key) return res.status(400).json({ error: 'Chave do arquivo não fornecida.' });

    // TODO: Adicionar lógica para validar se o usuário tem permissão para ver ESTE documento específico
    // Por enquanto validamos apenas se está autenticado.

    const command = new GetObjectCommand({
      Bucket: s3.bucket,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // Expira em 1 hora
    res.json({ success: true, url });
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
