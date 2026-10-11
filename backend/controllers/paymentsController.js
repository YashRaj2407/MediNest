import pool from '../config/db.js';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import dotenv from 'dotenv';
import { broadcastScheduleUpdate } from '../services/sseService.js';

dotenv.config();
dotenv.config({ path: '.env.local' });

const razorpayKeyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || '';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';

/**
 * Format a Date object or date/time string to MySQL 'YYYY-MM-DD HH:MM:SS' in IST (+05:30)
 */
function toMySQLDatetime(dateVal) {
  if (!dateVal) return null;
  if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateVal)) {
    return dateVal;
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  if (d.getFullYear() < 2025) {
    d.setFullYear(new Date().getFullYear() || 2026);
  }
  // Convert UTC to IST (+05:30)
  const istTime = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
  return istTime.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * POST /api/v1/payments/create-order
 * Creates a Razorpay order and holds the requested slot in MySQL.
 */
export async function createRazorpayOrder(req, res) {
  if (!razorpayKeyId || !razorpayKeySecret) {
    console.error('[Razorpay Config Error] Missing server-side Razorpay credentials (RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET).');
    return res.status(500).json({ error: 'Razorpay credentials are not configured on the server.' });
  }

  const connection = await pool.getConnection();
  try {
    const { amount_inr, appointment_ref, doctor_id, slot_datetime } = req.body;

    if (!amount_inr || !appointment_ref) {
      return res.status(400).json({ error: 'amount_inr and appointment_ref are required' });
    }

    const formattedSlotDatetime = toMySQLDatetime(slot_datetime);

    await connection.beginTransaction();

    // 0. Verify doctor is currently accepting appointments
    if (doctor_id) {
      const [docCheck] = await connection.query(
        `SELECT accepting_appointments, name FROM doctor_profiles WHERE id = ?`,
        [doctor_id]
      );
      if (docCheck.length > 0 && !docCheck[0].accepting_appointments) {
        await connection.rollback();
        console.warn(`[Order Rejected] Doctor ${doctor_id} has paused new appointments.`);
        return res.status(400).json({
          error: `Dr. ${docCheck[0].name} has paused new appointments. Bookings are temporarily blocked.`
        });
      }
    }

    // 1. Check double-booking & active unexpired slot holds
    if (doctor_id && formattedSlotDatetime) {
      console.log(`[Slot Check] Checking conflicts for doctor=${doctor_id} at slot=${formattedSlotDatetime}`);
      const [existingAppts] = await connection.query(
        `SELECT id FROM appointments 
         WHERE doctor_id = ? AND start_datetime = ? AND status IN ('upcoming', 'completed')
         FOR UPDATE`,
        [doctor_id, formattedSlotDatetime]
      );

      if (existingAppts.length > 0) {
        await connection.rollback();
        console.warn(`[Slot Check Conflict] Slot ${formattedSlotDatetime} already booked for doctor ${doctor_id}`);
        return res.status(409).json({ error: 'This time slot has already been booked by another patient.' });
      }

      const [existingHolds] = await connection.query(
        `SELECT id FROM slot_holds 
         WHERE doctor_id = ? AND slot_datetime = ? AND expires_at > NOW() AND confirmed = FALSE
         FOR UPDATE`,
        [doctor_id, formattedSlotDatetime]
      );

      if (existingHolds.length > 0) {
        await connection.rollback();
        console.warn(`[Slot Check Conflict] Slot ${formattedSlotDatetime} currently held for doctor ${doctor_id}`);
        return res.status(409).json({ error: 'This time slot is currently on payment hold by another patient.' });
      }

      // Check if slot falls into a doctor schedule block (break / holiday / leave / blocked)
      const [existingBlocks] = await connection.query(
        `SELECT id, type, reason FROM doctor_schedule_blocks
         WHERE doctor_id = ? 
           AND start_datetime < DATE_ADD(?, INTERVAL 30 MINUTE)
           AND end_datetime > ?
         LIMIT 1`,
        [doctor_id, formattedSlotDatetime, formattedSlotDatetime]
      );

      if (existingBlocks.length > 0) {
        await connection.rollback();
        const block = existingBlocks[0];
        const reason = block.type === 'break' 
          ? 'Doctor is on break during this time slot. Please choose another slot.' 
          : (block.reason || 'This slot is no longer available. Doctor is unavailable.');
        console.warn(`[Slot Check Blocked] Slot ${formattedSlotDatetime} blocked for doctor ${doctor_id}: ${reason}`);
        return res.status(409).json({ error: reason });
      }
    }

    // 2. Initialize Real Razorpay Order
    const amountPaise = Math.round(Number(amount_inr) * 100);
    console.log(`[Razorpay Order] Creating order: ref=${appointment_ref} amount=INR ${amount_inr} (${amountPaise} paise)`);

    const razorpay = new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });
    const rzpOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: appointment_ref.slice(0, 40),
      notes: { doctor_id: doctor_id || '', slot_datetime: formattedSlotDatetime || '' },
    });
    const orderId = rzpOrder.id;
    console.log(`[Razorpay Order Success] Order ID=${orderId}`);

    // 3. Create 10-min slot hold
    if (doctor_id && formattedSlotDatetime) {
      const holdId = crypto.randomUUID();

      console.log(`[Slot Hold] Holding slot for doctor=${doctor_id} at ${formattedSlotDatetime} for 10 minutes`);
      await connection.query(
        `INSERT INTO slot_holds (id, doctor_id, slot_datetime, order_id, expires_at, confirmed)
         VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), FALSE)`,
        [holdId, doctor_id, formattedSlotDatetime, orderId]
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
    console.error('[Create Razorpay Order Error]:', error.message);
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
  if (!razorpayKeySecret) {
    console.error('[Razorpay Config Error] Missing RAZORPAY_KEY_SECRET on server.');
    return res.status(500).json({ error: 'Razorpay secret key is not configured on the server.' });
  }

  const connection = await pool.getConnection();
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, appointment } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !appointment) {
      return res.status(400).json({ error: 'Missing required payment verification fields' });
    }

    // 1. HMAC Signature Verification
    console.log(`[Payment Verification] Verifying signature for order=${razorpay_order_id} payment=${razorpay_payment_id}`);
    const expectedSig = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      console.warn(`[Payment Verification Failure] Invalid signature for order=${razorpay_order_id}`);
      return res.status(400).json({ error: 'Invalid payment signature. Verification failed.' });
    }
    console.log(`[Payment Verification Success] Signature verified for order=${razorpay_order_id}`);

    await connection.beginTransaction();

    // 2. Lock & Confirm Slot Hold
    console.log(`[Slot Hold] Confirming hold for order=${razorpay_order_id}`);
    await connection.query(
      `UPDATE slot_holds SET confirmed = TRUE WHERE order_id = ?`,
      [razorpay_order_id]
    );

    // 3. Ensure patient profile exists in profiles table with strict identity isolation
    const patientId = appointment.patient_id || `patient_${crypto.randomUUID()}`;
    const patientEmail = (appointment.patient_email || 'patient@medinest.in').trim().toLowerCase();
    const patientName = appointment.patient_name || 'MediNest Patient';
    const patientPhone = appointment.patient_phone || null;

    console.log(`[Profile Sync] Upserting patient profile: id=${patientId}, email=${patientEmail}`);
    const [existingRows] = await connection.query(`SELECT id FROM profiles WHERE id = ?`, [patientId]);
    if (existingRows.length > 0) {
      await connection.query(
        `UPDATE profiles SET
           full_name = COALESCE(?, full_name),
           phone = COALESCE(?, phone)
         WHERE id = ?`,
        [patientName, patientPhone, patientId]
      );
    } else {
      // Check if an older profile with a different ID holds this email address
      const [conflictingProfiles] = await connection.query(
        `SELECT id, full_name FROM profiles WHERE LOWER(email) = ? AND id != ?`,
        [patientEmail, patientId]
      );
      for (const oldP of conflictingProfiles) {
        const safeSuffix = oldP.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8) || 'prev';
        const archiveEmail = `archived_${safeSuffix}_${Date.now()}@medinest.archived`;
        await connection.query(
          `UPDATE profiles SET
             email = ?,
             account_status = CASE WHEN account_status = 'active' THEN 'deactivated' ELSE account_status END
           WHERE id = ?`,
          [archiveEmail, oldP.id]
        );
        console.log(`[Identity Isolation] Archived email for previous patient identity ${oldP.id} to preserve data isolation.`);
      }

      await connection.query(
        `INSERT INTO profiles (id, role, full_name, email, phone, account_status)
         VALUES (?, 'patient', ?, ?, ?, 'active')`,
        [patientId, patientName, patientEmail, patientPhone]
      );
    }

    // Verify doctor is still accepting appointments
    if (appointment.doctor_id) {
      const [docCheck] = await connection.query(
        `SELECT accepting_appointments, name FROM doctor_profiles WHERE id = ?`,
        [appointment.doctor_id]
      );
      if (docCheck.length > 0 && !docCheck[0].accepting_appointments) {
        await connection.rollback();
        console.warn(`[Payment Insert Rejected] Doctor ${appointment.doctor_id} has paused new appointments.`);
        return res.status(400).json({
          error: `Dr. ${docCheck[0].name} has paused new appointments. Bookings are temporarily blocked.`
        });
      }
    }

    // 4. Format datetimes
    const startDT = toMySQLDatetime(appointment.start_datetime) || toMySQLDatetime(new Date());
    const endDT = toMySQLDatetime(appointment.end_datetime) || toMySQLDatetime(new Date(Date.now() + 30 * 60 * 1000));

    // 5. Insert Appointment Record
    console.log(`[Appointment Insert] Persisting appointment=${appointment.id} for doctor=${appointment.doctor_id}`);
    await connection.query(
      `INSERT INTO appointments (
        id, patient_id, doctor_id, consultation_type, start_datetime, end_datetime,
        symptoms, status, payment_status, total_inr, fee_inr, platform_fee_inr, taxes_inr,
        patient_name, patient_age, patient_gender, patient_phone, patient_email,
        video_link, razorpay_order_id, razorpay_payment_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'upcoming', 'paid', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = 'upcoming', payment_status = 'paid'`,
      [
        appointment.id,
        patientId,
        appointment.doctor_id,
        appointment.consultation_type || 'video',
        startDT,
        endDT,
        appointment.symptoms || 'Routine consultation',
        Number(appointment.total_inr) || 0,
        Number(appointment.fee_inr) || 0,
        Number(appointment.platform_fee_inr) || 0,
        Number(appointment.taxes_inr) || 0,
        patientName,
        Number(appointment.patient_age) || 30,
        appointment.patient_gender || 'Male',
        patientPhone || '',
        patientEmail,
        appointment.video_link || null,
        razorpay_order_id,
        razorpay_payment_id,
      ]
    );

    // 6. Insert Payment Record
    const paymentId = crypto.randomUUID();
    console.log(`[Payment Insert] Persisting payment record id=${paymentId}`);
    await connection.query(
      `INSERT INTO payments (id, appointment_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, payment_method, amount_inr, status, paid_at)
       VALUES (?, ?, ?, ?, ?, 'Razorpay', ?, 'paid', NOW())`,
      [paymentId, appointment.id, razorpay_order_id, razorpay_payment_id, razorpay_signature, Number(appointment.total_inr) || 0]
    );

    // 7. Insert Receipt Record
    const receiptId = crypto.randomUUID();
    const receiptNumber = `AGC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}`;
    console.log(`[Receipt Insert] Generating receipt=${receiptNumber}`);
    await connection.query(
      `INSERT INTO receipts (id, appointment_id, receipt_number, issued_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE receipt_number = VALUES(receipt_number)`,
      [receiptId, appointment.id, receiptNumber]
    );

    await connection.commit();

    // Broadcast real-time schedule update to patient browsers
    broadcastScheduleUpdate(appointment.doctor_id, {
      action: 'appointment_booked',
      date: startDT ? startDT.slice(0, 10) : null,
    });

    return res.json({
      success: true,
      appointment_id: appointment.id,
      razorpay_payment_id,
      receipt_number: receiptNumber,
    });
  } catch (error) {
    await connection.rollback();
    console.error('[Payment Verification Error]:', error.message);
    return res.status(500).json({ error: error.message || 'Payment verification failed' });
  } finally {
    connection.release();
  }
}
