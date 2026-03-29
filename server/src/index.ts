import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { createServer } from 'http';
import dotenv from 'dotenv';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';
import { v4 as uuidv4 } from 'uuid';
import { streamToBuffer } from './utils'; // Helper for PDF stream

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// -- ENV Variables --
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xpbyihsyblghajbcvudb.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_PvQ1jdTVwzgRxOKuNFxR7g_gNwKTi1s'; // Needs DB key
const REDIS_URL = process.env.REDIS_URL || 'redis://default:gQAAAAAAAQvoAAIncDJkZGQ5MjQ4MmRiODY0ZDY5YTQ2NjQwZWZlOGE3ZmFiYXAyNjg1ODQ@next-basilisk-68584.upstash.io:6379';

// Instances
const redis = new Redis(REDIS_URL, { tls: { rejectUnauthorized: false } });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// -- API Routes --

// 0. AUTHENTICATION (SUPABASE REAL DATA)
app.post('/api/patient/auth', async (req, res) => {
  try {
    const { cpf } = req.body;
    // Query Supabase for real patient
    const { data: patient, error } = await supabase.from('patients').select('*').eq('cpf', cpf).single();
    
    if (error || !patient) {
        return res.status(401).json({ error: 'Paciente não encontrado. Operação recusada. É necessário ter cadastro no Supabase antes de entrar.' });
    }
    
    res.json({ success: true, patient });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/patient/register', async (req, res) => {
  try {
    const { name, cpf, age, email } = req.body;
    // Insert real patient into Supabase
    const { data: patient, error } = await supabase.from('patients').insert([{ name, cpf, age, email }]).select().single();
    
    if (error) {
        return res.status(400).json({ error: `Erro ao cadastrar no Supabase: ${error.message}` });
    }
    
    res.json({ success: true, patient });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/doctor/auth', async (req, res) => {
  try {
    const { login, password } = req.body; // login can be CRM or Email
    // Query Supabase for real doctor
    // Assuming table 'doctors' has 'crm' or 'email' and 'password'
    const { data: doctor, error } = await supabase.from('doctors')
        .select('*')
        .or(`crm.eq.${login},email.eq.${login}`)
        .eq('password', password)
        .single();
        
    if (error || !doctor) {
        return res.status(401).json({ error: 'Credenciais inválidas. Médico não cadastrado no Supabase.' });
    }
    
    res.json({ success: true, doctor });
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
    const parsedQueue = queueData.map(q => JSON.parse(q));
    res.json(parsedQueue);
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
    } catch(err: any) {
        res.status(500).json({ error: err.message });
    }
});

// 4. End Consultation & Generate PDF
app.post('/api/end-consultation', async (req, res) => {
  try {
    const { patientId, doctorId, notes, prescriptions, exams } = req.body;
    
    const patientStr = await redis.get(`consultation:${patientId}`);
    if(!patientStr) return res.status(404).json({ error: 'Consulta não encontrada' });
    const patient = JSON.parse(patientStr);

    // Generate PDF
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    
    doc.fontSize(20).text('Prontuário Médico - Pronto Socorro Online', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Paciente: ${patient.name}`);
    doc.text(`CPF: ${patient.cpf} | Idade: ${patient.age}`);
    doc.text(`Queixa: ${patient.complaint}`);
    doc.moveDown();
    doc.text(`Evolução:`);
    doc.text(notes);
    doc.moveDown();
    if(prescriptions) {
        doc.text(`Receita/Encaminhamento:`);
        doc.text(prescriptions);
    }
    if(exams) {
        doc.moveDown();
        doc.text(`Exames Solicitados:`);
        doc.text(exams);
    }
    doc.end();

    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
    });

    // Save to Supabase Storage (S3 API or Standard)
    const filePath = `prontuarios/${patientId}_${Date.now()}.pdf`;
    const { data, error } = await supabase.storage
      .from('s3') // assuming bucket name is 's3' or standard
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf'
      });
      
    if (error && error.message !== 'The resource already exists') {
        console.error("Supabase error:", error);
    }

    // Save metadata in DB
    await supabase.from('consultations').insert({
        patient_id: patient.id,
        patient_cpf: patient.cpf,
        doctor_id: doctorId,
        notes,
        pdf_path: data?.path || filePath
    });

    // Cleanup Redis
    await redis.del(`consultation:${patientId}`);
    
    // Notify Patient via socket
    io.to(patientId).emit('consultation_ended', { pdf_path: data?.path || filePath });

    res.json({ success: true, message: 'Consultation ended and saved' });
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

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
