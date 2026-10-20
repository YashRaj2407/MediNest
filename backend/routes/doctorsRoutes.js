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
  handleDocumentUpload,
  getSavedDoctors,
  saveDoctor,
  removeSavedDoctor
} from '../controllers/doctorsController.js';

const router = express.Router();

router.get('/featured', getFeaturedDoctors);
router.get('/saved', requireAuth, getSavedDoctors);
router.post('/saved/:doctorId', requireAuth, saveDoctor);
router.post('/saved', requireAuth, saveDoctor);
router.delete('/saved/:doctorId', requireAuth, removeSavedDoctor);
router.get('/', getDoctors);
router.post('/login', requireAuth, doctorLogin);
// Photo/document upload and registration are public during onboarding (no auth required).
// Optional auth is handled inside registerDoctor via req.user or req.body.userId.
router.post('/upload-photo', uploadPhoto.single('photo'), handlePhotoUpload);
router.post('/upload-document', uploadDocument.single('document'), handleDocumentUpload);
router.post('/register', registerDoctor);
router.get('/profile/by-user/:userId', getDoctorProfileByUserId);
router.get('/:id/stats', getDoctorStats);
router.patch('/:id/photo', uploadDoctorPhoto);
router.get('/:id', getDoctorById);
router.patch('/:id', updateDoctorProfile);

export default router;
