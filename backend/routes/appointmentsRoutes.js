import express from 'express';
import {
  getPatientAppointments,
  getDoctorAppointments,
  cancelAppointment,
  rescheduleAppointment,
} from '../controllers/appointmentsController.js';

const router = express.Router();

router.get('/patient', getPatientAppointments);
router.get('/doctor/:doctorId', getDoctorAppointments);
router.patch('/:id/cancel', cancelAppointment);
router.patch('/:id/reschedule', rescheduleAppointment);

export default router;
