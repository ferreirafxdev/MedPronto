import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { rateLimit } from 'express-rate-limit';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

router.post('/patient/auth', authLimiter, authController.patientAuth);
router.post('/doctor/auth', authLimiter, authController.doctorAuth);
router.post('/admin/auth', authController.adminAuth);

export default router;
