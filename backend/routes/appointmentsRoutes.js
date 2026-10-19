import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getPatientAppointments,
  getDoctorAppointments,
  completeAppointment,
  savePrescription,
  cancelAppointment,
  rescheduleAppointment,
  deleteAppointment,
  subscribeAppointmentEvents,
} from '../controllers/appointmentsController.js';

const router = express.Router();

router.get('/events', subscribeAppointmentEvents);
router.get('/patient', requireAuth, getPatientAppointments);
router.get('/doctor/:doctorId', getDoctorAppointments);
router.patch('/:id/complete', requireAuth, completeAppointment);
router.patch('/:id/cancel', requireAuth, cancelAppointment);
router.patch('/:id/reschedule', requireAuth, rescheduleAppointment);
router.delete('/:id', requireAuth, deleteAppointment);
router.post('/:id/prescription', requireAuth, savePrescription);

export default router;
