import { Router } from 'express';
import * as doctorController from '../controllers/doctor.controller';
import { authenticateToken, authorizeDoctor } from '../middleware/auth.middleware';
import { rateLimit } from 'express-rate-limit';

const router = Router();
const validateLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 100 });

router.post('/atestado', authenticateToken, authorizeDoctor, doctorController.createAtestado);
router.post('/end-consultation', authenticateToken, authorizeDoctor, doctorController.endConsultation);
router.get('/validate-document/:code', validateLimiter, doctorController.validateDocument);
router.get('/doctor/stats/:id', authenticateToken, authorizeDoctor, doctorController.getDoctorStats);

export default router;
