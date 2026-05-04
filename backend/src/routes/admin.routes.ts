import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { authenticateToken, authorizeAdmin } from '../middleware/auth.middleware';
import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { patientQueue, documentQueue } from '../queue';

const router = Router();

// Infrastructure Dashboard (Queues)
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
createBullBoard({
  queues: [new BullMQAdapter(patientQueue), new BullMQAdapter(documentQueue)],
  serverAdapter: serverAdapter,
});

router.use('/queues', authenticateToken, authorizeAdmin, serverAdapter.getRouter());
router.get('/infra-status', authenticateToken, authorizeAdmin, adminController.getInfraStatus);

// Management
router.get('/doctors', authenticateToken, authorizeAdmin, adminController.getDoctors);
router.post('/doctors', authenticateToken, authorizeAdmin, adminController.createDoctor);
router.delete('/doctors/:id', authenticateToken, authorizeAdmin, adminController.deleteDoctor);
router.get('/patients', authenticateToken, authorizeAdmin, adminController.getPatients);
router.post('/release-document', authenticateToken, authorizeAdmin, adminController.releaseDocument);

export default router;
