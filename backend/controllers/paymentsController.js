import pool from '../config/db.js';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' });

const razorpayKeyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || '';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';

/**
 * POST /api/v1/payments/create-order
 * Creates a Razorpay order and holds the requested slot in MySQL.
 */
export async function createRazorpayOrder(req, res) {
  const connection = await pool.getConnection();
  try {
    const { amount_inr, appointment_ref, doctor_id, slot_datetime } = req.body;

    if (!amount_inr || !appointment_ref) {
      return res.status(400).json({ error: 'amount_inr and appointment_ref are required' });
    }

    await connection.beginTransaction();

    // 1. Check double-booking & active unexpired slot holds
    if (doctor_id && slot_datetime) {
      const [existingAppts] = await connection.query(
        `SELECT id FROM appointments 
         WHERE doctor_id = ? AND start_datetime = ? AND status IN ('upcoming', 'completed')
         FOR UPDATE`,
        [doctor_id, slot_datetime]
      );

      if (existingAppts.length > 0) {
        await connection.rollback();
        return res.status(409).json({ error: 'This time slot has already been booked by another patient.' });
      }

      const [existingHolds] = await connection.query(
        `SELECT id FROM slot_holds 
         WHERE doctor_id = ? AND slot_datetime = ? AND expires_at > NOW() AND confirmed = FALSE
         FOR UPDATE`,
        [doctor_id, slot_datetime]
      );

      if (existingHolds.length > 0) {
        await connection.rollback();
        return res.status(409).json({ error: 'This time slot is currently on payment hold by another patient.' });
      }
    }

    // 2. Initialize Razorpay order
    let orderId = `order_demo_${Date.now()}`;
    const amountPaise = Math.round(Number(amount_inr) * 100);

    if (razorpayKeyId && razorpayKeySecret) {
      const razorpay = new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });
      const rzpOrder = await razorpay.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: appointment_ref.slice(0, 40),
        notes: { doctor_id: doctor_id || '', slot_datetime: slot_datetime || '' },
      });
      orderId = rzpOrder.id;
    }

    // 3. Create 10-min slot hold
    if (doctor_id && slot_datetime) {
      const holdId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // +10 minutes

      await connection.query(
        `INSERT INTO slot_holds (id, doctor_id, slot_datetime, order_id, expires_at, confirmed)
         VALUES (?, ?, ?, ?, ?, FALSE)`,
        [holdId, doctor_id, slot_datetime, orderId, expiresAt]
      );
    }

    await connection.commit();

    return res.json({
      order_id: orderId,
      key_id: razorpayKeyId,
      amount: amountPaise,
    });
  } catch (error) {
    await connection.rollback();
    console.error('[Express Create Razorpay Order Error]:', error);
    return res.status(500).json({ error: error.message || 'Failed to create payment order' });
  } finally {
    connection.release();
  }
}

/**
 * POST /api/v1/payments/verify
 * Verifies HMAC-SHA256 signature and confirms appointment in MySQL.
 */
export async function verifyRazorpayPayment(req, res) {
  const connection = await pool.getConnection();
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, appointment } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !appointment) {
      return res.status(400).json({ error: 'Missing required payment verification fields' });
    }

    // 1. HMAC Signature Verification
    if (razorpayKeySecret && razorpay_signature) {
      const expectedSig = crypto
        .createHmac('sha256', razorpayKeySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (expectedSig !== razorpay_signature) {
        return res.status(400).json({ error: 'Invalid payment signature. Payment verification failed.' });
      }
    }

    await connection.beginTransaction();

    // 2. Lock & Confirm Slot Hold
    await connection.query(
      `UPDATE slot_holds SET confirmed = TRUE WHERE order_id = ?`,
      [razorpay_order_id]
    );

    // 3. Insert Appointment Record
    await connection.query(
      `INSERT INTO appointments (
        id, patient_id, doctor_id, consultation_type, start_datetime, end_datetime,
        symptoms, status, payment_status, total_inr, fee_inr, platform_fee_inr, taxes_inr,
        patient_name, patient_age, patient_gender, patient_phone, patient_email,
        razorpay_order_id, razorpay_payment_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'upcoming', 'paid', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = 'upcoming', payment_status = 'paid'`,
      [
        appointment.id,
        appointment.patient_id || 'demo_patient_id',
        appointment.doctor_id,
        appointment.consultation_type,
        appointment.start_datetime,
        appointment.end_datetime,
        appointment.symptoms || 'Routine consultation',
        appointment.total_inr,
        appointment.fee_inr,
        appointment.platform_fee_inr || 0,
        appointment.taxes_inr || 0,
        appointment.patient_name,
        appointment.patient_age,
        appointment.patient_gender || 'Male',
        appointment.patient_phone,
        appointment.patient_email,
        razorpay_order_id,
        razorpay_payment_id,
      ]
    );

    // 4. Insert Payment Record
    const paymentId = crypto.randomUUID();
    await connection.query(
      `INSERT INTO payments (id, appointment_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, payment_method, amount_inr, status, paid_at)
       VALUES (?, ?, ?, ?, ?, 'Razorpay', ?, 'paid', NOW())`,
      [paymentId, appointment.id, razorpay_order_id, razorpay_payment_id, razorpay_signature || '', appointment.total_inr]
    );

    // 5. Insert Receipt Record
    const receiptId = crypto.randomUUID();
    const receiptNumber = `AGC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}`;
    await connection.query(
      `INSERT INTO receipts (id, appointment_id, receipt_number, issued_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE receipt_number = VALUES(receipt_number)`,
      [receiptId, appointment.id, receiptNumber]
    );

    await connection.commit();

    return res.json({
      success: true,
      appointment_id: appointment.id,
      razorpay_payment_id,
      receipt_number: receiptNumber,
    });
  } catch (error) {
    await connection.rollback();
    console.error('[Express Verify Payment Error]:', error);
    return res.status(500).json({ error: error.message || 'Payment verification failed' });
  } finally {
    connection.release();
  }
}
