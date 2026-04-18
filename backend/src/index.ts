import express from 'express';
import cors from 'cors';
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
import dns from 'dns';

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
const JWT_SECRET = process.env.JWT_SECRET || 'medpronto-secret-key-2026';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Redis removed - Using Supabase PostgreSQL for Queue
const redis = null;

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

    // Fixed Revenue Split: R$ 50 total (R$ 25 Doctor / R$ 25 Site)
    const revenue = totalConsultations * 50;
    const costs = totalConsultations * 25; // Paid to doctors
    const profit = totalConsultations * 25; // Net for site

    res.json({ success: true, stats: { totalConsultations, revenue, costs, profit, patientCount, doctorCount } });
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

// 1. Patient enqueue
app.post('/api/enqueue', async (req, res) => {
  try {
    const { id, name, complaint } = req.body;
    
    // Insert into DB queue
    const [q] = await sql`
      INSERT INTO queue (patient_id, name, complaint, status)
      VALUES (${id}, ${name}, ${complaint}, 'waiting')
      RETURNING *
    `;

    // Broadcast queue update
    io.emit('queue_updated');

    res.json({ success: true, patient: q });
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

// 3. Doctor: Take Patient
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

    io.emit('queue_updated');
    res.json({ success: true, patient: { ...patient, id: patient.patient_id, roomId: patient.patient_id } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. End Consultation & Generate PDF
app.post('/api/end-consultation', authenticateToken, authorizeDoctor, async (req, res) => {
  try {
    const { patientId, doctorId, notes, prescriptions, exams } = req.body;

    const [patient] = await sql`SELECT * FROM queue WHERE patient_id = ${patientId} LIMIT 1`;
    if (!patient) return res.status(404).json({ error: 'Consulta não encontrada' });

    // Fetch doctor data from Neon
    const docResults = await sql`SELECT * FROM doctors WHERE id = ${doctorId} LIMIT 1`;
    const doctor = docResults[0];
    if (!doctor) return res.status(404).json({ error: 'Dados do médico não encontrados.' });

    // Generate PDF using PDFTemplate
    const template = new PDFTemplate();
    const doc = template.getDocument();
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));

    template.drawLayout('Resumo da Consulta', doctor.name, doctor.crm);
    
    let content = `Paciente: ${patient.name.toUpperCase()}\nCPF: ${patient.cpf}\n\n`;
    content += `Motivo da Consulta:\n${patient.complaint}\n\n`;
    content += `Anamnese e Evolução:\n${notes}\n\n`;
    content += `Prescrição de Conduta:\n${prescriptions}\n\n`;
    content += `Exames Solicitados:\n${exams}`;

    template.addContent(content);
    template.finalize();

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

    // Finalize: Remove from DB Queue
    await sql`DELETE FROM queue WHERE patient_id = ${patientId}`;

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

    const [patient] = await sql`SELECT * FROM queue WHERE patient_id = ${patientId} LIMIT 1`;
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado na sessão ativa.' });

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

    const template = new PDFTemplate();
    const doc = template.getDocument();
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));

    template.drawLayout('Atestado Médico', doctor.name, doctor.crm);
    
    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

    const bodyText = `Atesto, para os devidos fins, que o(a) paciente ${patient.name.toUpperCase()}, portador(a) do CPF ${patient.cpf}, foi atendido(a) via teleconsulta nesta data, apresentando quadro clínico que justifica o afastamento de suas atividades por ${daysOff} dias, a contar de ${formattedDate}.\n\nCID: ${cid || 'Não informado'}.\n\nCódigo de Autenticação: ${validationCode}`;

    template.addContent(bodyText);
    template.finalize();

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

    const [patient] = await sql`SELECT * FROM queue WHERE patient_id = ${patientId} LIMIT 1`;
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado na sessão ativa.' });

    const docResults = await sql`SELECT * FROM doctors WHERE id = ${doctorId} LIMIT 1`;
    const doctor = docResults[0];
    if (!doctor) return res.status(404).json({ error: 'Dados do médico não encontrados.' });

    const template = new PDFTemplate();
    const doc = template.getDocument();
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));

    template.drawLayout('Prescrição Médica', doctor.name, doctor.crm);
    
    template.addContent(`Paciente: ${patient.name.toUpperCase()}\nCPF: ${patient.cpf}\n\nPrescrições:\n${prescriptions || 'Sem prescrições registradas.'}`);
    
    template.finalize();
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

    const [patient] = await sql`SELECT * FROM queue WHERE patient_id = ${patientId} LIMIT 1`;
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado na sessão ativa.' });

    const docResults = await sql`SELECT * FROM doctors WHERE id = ${doctorId} LIMIT 1`;
    const doctor = docResults[0];
    if (!doctor) return res.status(404).json({ error: 'Dados do médico não encontrados.' });

    const template = new PDFTemplate();
    const doc = template.getDocument();
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));

    template.drawLayout('Requisição de Exames', doctor.name, doctor.crm);
    
    template.addContent(`Paciente: ${patient.name.toUpperCase()}\nCPF: ${patient.cpf}\n\nSolicito a realização dos seguintes exames para fins diagnósticos:\n\n${exams || 'Nenhum exame detalhado.'}`);

    template.finalize();
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
