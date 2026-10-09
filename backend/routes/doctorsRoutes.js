import express from 'express';
import { 
  getDoctors, 
  getDoctorById, 
  updateDoctorProfile,
  doctorLogin,
  getDoctorProfileByUserId,
  registerDoctor,
  getDoctorStats,
  uploadDoctorPhoto,
  getFeaturedDoctors
} from '../controllers/doctorsController.js';

const router = express.Router();

router.get('/featured', getFeaturedDoctors);
router.get('/', getDoctors);
router.post('/login', doctorLogin);
router.post('/register', registerDoctor);
router.get('/profile/by-user/:userId', getDoctorProfileByUserId);
router.get('/:id/stats', getDoctorStats);
router.patch('/:id/photo', uploadDoctorPhoto);
router.get('/:id', getDoctorById);
router.patch('/:id', updateDoctorProfile);

export default router;
