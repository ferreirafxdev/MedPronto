import { Router } from 'express';
import * as patientController from '../controllers/patient.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { rateLimit } from 'express-rate-limit';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

router.post('/register', authLimiter, patientController.registerPatient);
router.get('/history/:cpf', authenticateToken, patientController.getPatientHistory);
router.get('/check-queue/:patientId', patientController.checkQueueStatus);

export default router;
