import express from 'express';
import {
  getSlots,
  checkBreakConflicts,
  createScheduleBlock,
  deleteScheduleBlock,
} from '../controllers/slotsController.js';

const router = express.Router();

router.get('/', getSlots);
router.post('/blocks/check-conflicts', checkBreakConflicts);
router.post('/blocks', createScheduleBlock);
router.delete('/blocks/:id', deleteScheduleBlock);

export default router;
