import express from 'express';
import { syncUserProfile, getUserProfile } from '../controllers/authController.js';

const router = express.Router();

router.post('/sync-profile', syncUserProfile);
router.get('/profile/:userId', getUserProfile);

export default router;
