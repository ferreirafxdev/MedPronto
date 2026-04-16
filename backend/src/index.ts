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
import { streamToBuffer } from './utils'; 
import sql from './db';

dotenv.config();

// 1. INICIALIZAÇÃO DO APP (Deve vir antes do CORS)
const app = express();

const allowedOrigins = [
  'http://localhost:5173', 
  'http://127.0.0.1:5173', 
  'https://med-pronto-wph4.vercel.app',
  /\.vercel\.app$/ // Permite subdomínios da Vercel
];

// 2. CONFIGURAÇÃO DO CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));

app.use(express.json());

// 3. SERVIDOR HTTP E SOCKET.IO
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins as any, // Cast para evitar erro de tipo com RegExp
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// -- Variáveis de Ambiente --
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const REDIS_URL = process.env.REDIS_URL || '';
const JWT_SECRET = process.env.JWT_SECRET || 'medpronto-secret-key-2026';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// INSTÂNCIAS
const redis = new Redis(REDIS_URL, { 
    tls: { rejectUnauthorized: false },
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
        return Math.min(times * 100, 3000);
    }
});

redis.on('error', (err) => console.error('❌ Redis Connection Error:', err.message));
redis.on('connect', () => console.log('✅ Connected to Redis'));

let supabase: any = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.warn("⚠️ SUPABASE_URL ou SUPABASE_KEY não configurados.");
}

// -- Middlewares --
const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'Token não fornecido.' });
    
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.status(403).json({ error: 'Token inválido.' });
        req.user = user;
        next();
    });
};

const authorizeAdmin = (req: any, res: any, next: any) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Acesso negado.' });
    next();
};

const authorizeDoctor = (req: any, res: any, next: any) => {
    if (req.user?.role !== 'doctor' && req.user?.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito.' });
    next();
};

// -- Rotas (O restante do seu código de rotas permanece igual aqui abaixo) --

// Exemplo da rota de registro que você estava testando
app.post('/api/patient/register', async (req, res) => {
  try {
    const { name, cpf, age, email, birthDate } = req.body;
    const results = await sql`
        INSERT INTO patients (name, cpf, age, email, birth_date) 
        VALUES (${name}, ${cpf}, ${age}, ${email}, ${birthDate}) 
        RETURNING *
    `;
    res.json({ success: true, patient: results[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ... (todas as outras rotas /api/...)

// INICIALIZAÇÃO
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
