import { requireAuth } from '../middleware/auth.js';
﻿import express from 'express';
import { uploadPhoto, uploadDocument } from '../middleware/upload.js';
import { 
  getDoctors, 
  getDoctorById, 
  updateDoctorProfile,
  doctorLogin,
  getDoctorProfileByUserId,
  registerDoctor,
  getDoctorStats,
  uploadDoctorPhoto,
  getFeaturedDoctors,
  handlePhotoUpload,
  handleDocumentUpload
} from '../controllers/doctorsController.js';

const router = express.Router();

router.get('/featured', getFeaturedDoctors);
router.get('/', getDoctors);
router.post('/login', requireAuth, doctorLogin);
router.post('/upload-photo', requireAuth, uploadPhoto.single('photo'), handlePhotoUpload);
router.post('/upload-document', requireAuth, uploadDocument.single('document'), handleDocumentUpload);
router.post('/register', requireAuth, registerDoctor);
router.get('/profile/by-user/:userId', getDoctorProfileByUserId);
router.get('/:id/stats', getDoctorStats);
router.patch('/:id/photo', uploadDoctorPhoto);
router.get('/:id', getDoctorById);
router.patch('/:id', updateDoctorProfile);

export default router;
