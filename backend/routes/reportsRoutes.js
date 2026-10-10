import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { submitReport, getMyReports } from '../controllers/reportsController.js';

const router = express.Router();

router.post('/', requireAuth, submitReport);
router.get('/my', requireAuth, getMyReports);

export default router;
