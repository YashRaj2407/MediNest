import express from 'express';
import { getDoctors, getDoctorById, updateDoctorProfile } from '../controllers/doctorsController.js';

const router = express.Router();

router.get('/', getDoctors);
router.get('/:id', getDoctorById);
router.patch('/:id', updateDoctorProfile);

export default router;
