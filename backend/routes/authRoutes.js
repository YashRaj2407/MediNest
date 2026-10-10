import express from 'express';
import {
  syncUserProfile,
  getUserProfile,
  adminLogin,
  checkEmailStatus,
  reconcileDeletedAccount
} from '../controllers/authController.js';

const router = express.Router();

router.post('/sync-profile', syncUserProfile);
router.get('/profile/:userId', getUserProfile);
router.post('/admin-login', adminLogin);
router.post('/check-email-status', checkEmailStatus);
router.post('/reconcile-deleted-account', reconcileDeletedAccount);

export default router;
