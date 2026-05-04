import { Router } from 'express';
import * as queueController from '../controllers/queue.controller';
import { authenticateToken, authorizeDoctor } from '../middleware/auth.middleware';

const router = Router();

router.post('/enqueue', authenticateToken, queueController.enqueuePatient);
router.get('/queue', authenticateToken, authorizeDoctor, queueController.getWaitingQueue);
router.post('/take-patient', authenticateToken, authorizeDoctor, queueController.takePatient);

export default router;
