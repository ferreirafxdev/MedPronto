import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import dns from 'dns';
import morgan from 'morgan';
import path from 'path';
import { config } from './config';

// Importação das rotas modulares
import authRoutes from './routes/auth.routes';
import patientRoutes from './routes/patient.routes';
import doctorRoutes from './routes/doctor.routes';
import adminRoutes from './routes/admin.routes';
import queueRoutes from './routes/queue.routes';
import miscRoutes from './routes/misc.routes';
import livekitRoutes from './routes/livekit.routes';

// Correção para problemas de conexão IPv6 em alguns ambientes (ex: Supabase/Postgres)
dns.setDefaultResultOrder('ipv4first');
dotenv.config();

const app = express();

// -- Middleware de Segurança e CORS --
app.use(helmet({ contentSecurityPolicy: false })); // Proteção de headers HTTP
const corsOptions = {
  origin: (origin: any, callback: any) => callback(null, true), // Libera conexões WebRTC e API de qualquer IP externo ou origem
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
};

app.use(cors(corsOptions));
 // Controle de acesso
app.set('trust proxy', 1); // Necessário para rate limiting atrás de proxies como Vercel/Cloudflare
app.use(express.json()); // Parser para JSON no corpo das requisições

// Serve arquivos de prontuários, atestados e receitas gerados localmente em /uploads
const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsDir));


// -- Coletor de Logs em Memória (Para exibição no Painel Admin) --
export const serverLogs: string[] = []; // Buffer de logs
app.use(morgan((tokens, req, res) => {
  const log = [
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
    tokens.res(req, res, 'content-length'), '-',
    tokens['response-time'](req, res), 'ms'
  ].join(' ');
  
  // Adiciona o log ao buffer com timestamp
  serverLogs.push(`[${new Date().toISOString()}] ${log}`);
  
  // Mantém apenas os últimos 100 logs para não estourar a memória
  if (serverLogs.length > 100) serverLogs.shift();
  return null; // Morgan continuará usando o log 'dev' padrão no console
}));

app.use(morgan('dev')); // Log padrão no terminal do servidor

// -- Rate Limiting (Proteção contra Brute Force/DDoS) --
const generalLimiter = rateLimit({ windowMs: 1 * 60 * 1000, max: 100 }); // Máximo 100 requisições por minuto por IP
app.use(generalLimiter);

// -- Registro de Rotas --
app.use('/api', authRoutes);         // Login e Autenticação
app.use('/api/patient', patientRoutes); // Fluxo de dados do paciente e histórico
app.use('/api', doctorRoutes);      // Fluxo médico (Atestados, Finalização de consulta)
app.use('/api/admin', adminRoutes);   // Gestão de infraestrutura, médicos e prontuários
app.use('/api', queueRoutes);       // Gestão de fila em tempo real (Redis)
app.use('/api/livekit', livekitRoutes); // Salas de Telemedicina com LiveKit SFU
app.use('/api', miscRoutes);        // Utilitários diversos

// Handler para rotas não encontradas (404)
app.use((req, res) => { 
  res.status(404).json({ error: 'Não encontrado' }); 
});

import { createServer } from 'http';
import { initializeWebSocket } from './websocket';
import { syncDatabaseSchema } from './utils/db';

// Inicialização do servidor
const PORT = config.port || 3001;
const httpServer = createServer(app);

// Inicializa o Socket.io
initializeWebSocket(httpServer);

httpServer.listen(PORT, async () => { 
  console.log(`🚀 MedPronto API rodando na porta ${PORT}`); 
  await syncDatabaseSchema();
});

