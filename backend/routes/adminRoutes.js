import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  getPatients,
  getAdminDoctors,
  getAdminAppointments,
  getAdminStats,
  updatePatientStatus,
  deletePatient,
  updateDoctorApproval,
  deleteDoctor,
  deleteDoctorPermanently,
  getReports,
  updateReport,
  getAuditLog,
  reconcileClerkUser
} from '../controllers/adminController.js';

const router = express.Router();

// All admin routes require authentication + admin role
router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/stats', getAdminStats);
router.get('/patients', getPatients);
router.get('/doctors', getAdminDoctors);
router.get('/appointments', getAdminAppointments);
router.patch('/patients/:id/status', updatePatientStatus);
router.delete('/patients/:id', deletePatient);
router.patch('/doctors/:id/approval', updateDoctorApproval);
router.delete('/doctors/:id', deleteDoctor);
router.delete('/doctors/:id/permanent', deleteDoctorPermanently);
router.post('/reconcile-clerk-user', reconcileClerkUser);
router.get('/reports', getReports);
router.patch('/reports/:id', updateReport);
router.get('/audit-log', getAuditLog);

export default router;

