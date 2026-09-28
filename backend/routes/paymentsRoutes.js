import express from 'express';
import { createRazorpayOrder, verifyRazorpayPayment } from '../controllers/paymentsController.js';

const router = express.Router();

router.post('/create-order', createRazorpayOrder);
router.post('/verify', verifyRazorpayPayment);

export default router;
