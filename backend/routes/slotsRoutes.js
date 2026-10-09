import express from 'express';
import {
  getSlots,
  getScheduleBlocks,
  checkBreakConflicts,
  createScheduleBlock,
  updateScheduleBlock,
  deleteScheduleBlock,
  subscribeSlotsEvents,
} from '../controllers/slotsController.js';

const router = express.Router();

router.get('/events', subscribeSlotsEvents);
router.get('/', getSlots);
router.get('/blocks', getScheduleBlocks);
router.post('/blocks/check-conflicts', checkBreakConflicts);
router.post('/blocks', createScheduleBlock);
router.put('/blocks/:id', updateScheduleBlock);
router.delete('/blocks/:id', deleteScheduleBlock);

export default router;
