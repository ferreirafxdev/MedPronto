import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import dns from 'dns';
import morgan from 'morgan';
import { config } from './config';

// Import Routes
import authRoutes from './routes/auth.routes';
import patientRoutes from './routes/patient.routes';
import doctorRoutes from './routes/doctor.routes';
import adminRoutes from './routes/admin.routes';
import queueRoutes from './routes/queue.routes';
import miscRoutes from './routes/misc.routes';

// Fix for Supabase IPv6 connection issues
dns.setDefaultResultOrder('ipv4first');
dotenv.config();

const app = express();

// -- Middleware --
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://med-pronto-wph4.vercel.app',
  'https://medpronto-online.vercel.app',
  /\.vercel\.app$/
];

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.set('trust proxy', 1);
app.use(express.json());
app.use(morgan('dev'));

const generalLimiter = rateLimit({ windowMs: 1 * 60 * 1000, max: 100 });
app.use(generalLimiter);

// -- Route Registration --
app.use('/api', authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api', doctorRoutes); // contains /api/validate-document, /api/atestado etc
app.use('/api/admin', adminRoutes);
app.use('/api', queueRoutes); // contains /api/enqueue, /api/take-patient
app.use('/api', miscRoutes);

// 404 Handler
app.use((req, res) => { 
  res.status(404).json({ error: 'Não encontrado' }); 
});

const PORT = config.port || 3001;
app.listen(PORT, () => { 
  console.log(`🚀 MedPronto API running on port ${PORT}`); 
});
