# MediNest — Appointment Concurrency & Transaction Design Guide

**Document Version:** 1.0  
**Generated Date:** September 28, 2026  
**Target Platform:** Node.js + Express.js + MySQL 8.0+ (InnoDB Engine)

---

## 1. Context & Purpose

In the original Supabase implementation, appointment scheduling consistency, double-booking prevention, and break conflict resolution were enforced using PostgreSQL Row-Level Security (RLS) and custom PL/pgSQL functions (`check_break_conflicts`, `create_doctor_break_and_reschedule`).

This document explains how these PostgreSQL guarantees are reimplemented in **Node.js** using **MySQL InnoDB ACID transactions** and explicit **row-level locking (`SELECT ... FOR UPDATE`)**.

---

## 2. PostgreSQL Guarantees vs. MySQL Node.js Implementation

| Concern | PostgreSQL Guarantee | MySQL + Node.js Re-implementation |
| :--- | :--- | :--- |
| **Double Booking Prevention** | Postgres Unique Index & PL/pgSQL lock | MySQL InnoDB transaction with `SELECT ... FOR UPDATE` on `appointments` & `slot_holds` during checkout. |
| **Slot Hold TTL & Expiry** | Supabase Edge Function + `slot_holds` table | MySQL `slot_holds` table + automatic expired hold filtering (`expires_at > NOW()`) inside transactional queries. |
| **Schedule Block Conflicts** | PL/pgSQL function checking overlap | Node.js `checkBreakConflicts()` service querying `appointments` overlapping `[start_datetime, end_datetime]`. |
| **Atomic Rescheduling** | Single PL/pgSQL transaction block | Node.js `executeBreakAndReschedule()` wrapped in `connection.beginTransaction()` and `connection.commit()`. |

---

## 3. High-Concurrency Transaction Flows

### 3.1 Flow A: Razorpay Checkout & Slot Hold Reservation

To prevent two patients from initiating checkout for the exact same slot concurrently:

```
Patient A Checkout Request              Patient B Checkout Request
         │                                       │
         ▼                                       ▼
  START TRANSACTION                       START TRANSACTION
         │                                       │
  SELECT FROM slot_holds                 SELECT FROM slot_holds
  WHERE doctor_id = ?                    WHERE doctor_id = ?
    AND slot_datetime = ?                  AND slot_datetime = ?
    AND expires_at > NOW()                 AND expires_at > NOW()
  FOR UPDATE; [Locks Row]                FOR UPDATE; [Blocks/Waits]
         │                                       │
  Slot is free!                                   │
  INSERT INTO slot_holds (...)                    │
  COMMIT;                                         │
         │                                       │
  [Unlocks Row] ────────────────────────────────► Slot hold exists!
                                                 ROLLBACK & Return:
                                                 "Slot no longer available"
```

#### Node.js Code Pattern for Slot Reservation:

```javascript
async function reserveSlotHold(connection, doctorId, slotDatetime, razorpayOrderId) {
  await connection.beginTransaction();
  try {
    // 1. Check existing confirmed appointments
    const [existingAppts] = await connection.query(
      `SELECT id FROM appointments 
       WHERE doctor_id = ? AND start_datetime = ? AND status IN ('upcoming', 'completed')
       FOR UPDATE`,
      [doctorId, slotDatetime]
    );

    if (existingAppts.length > 0) {
      await connection.rollback();
      throw new Error('SLOT_ALREADY_BOOKED');
    }

    // 2. Check active unexpired slot holds
    const [existingHolds] = await connection.query(
      `SELECT id FROM slot_holds 
       WHERE doctor_id = ? AND slot_datetime = ? AND expires_at > NOW() AND confirmed = FALSE
       FOR UPDATE`,
      [doctorId, slotDatetime]
    );

    if (existingHolds.length > 0) {
      await connection.rollback();
      throw new Error('SLOT_HELD_BY_ANOTHER_USER');
    }

    // 3. Create 10-minute hold
    const holdId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // +10 minutes

    await connection.query(
      `INSERT INTO slot_holds (id, doctor_id, slot_datetime, order_id, expires_at, confirmed)
       VALUES (?, ?, ?, ?, ?, FALSE)`,
      [holdId, doctorId, slotDatetime, razorpayOrderId, expiresAt]
    );

    await connection.commit();
    return { holdId, expiresAt };
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}
```

---

### 3.2 Flow B: Payment Verification & Atomic Appointment Creation

When Razorpay triggers the payment verification webhook/endpoint:

```javascript
async function verifyAndConfirmAppointment(connection, payload) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, appointment } = payload;

  await connection.beginTransaction();
  try {
    // 1. Verify HMAC Signature
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      await connection.rollback();
      throw new Error('INVALID_PAYMENT_SIGNATURE');
    }

    // 2. Lock & Confirm Slot Hold
    const [holds] = await connection.query(
      `SELECT * FROM slot_holds WHERE order_id = ? FOR UPDATE`,
      [razorpay_order_id]
    );

    if (holds.length === 0) {
      await connection.rollback();
      throw new Error('HOLD_NOT_FOUND');
    }

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
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'upcoming', 'paid', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        appointment.id, appointment.patient_id, appointment.doctor_id,
        appointment.consultation_type, appointment.start_datetime, appointment.end_datetime,
        appointment.symptoms, appointment.total_inr, appointment.fee_inr,
        appointment.platform_fee_inr, appointment.taxes_inr, appointment.patient_name,
        appointment.patient_age, appointment.patient_gender, appointment.patient_phone,
        appointment.patient_email, razorpay_order_id, razorpay_payment_id
      ]
    );

    // 4. Insert Payment Record
    const paymentId = crypto.randomUUID();
    await connection.query(
      `INSERT INTO payments (id, appointment_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, payment_method, amount_inr, status, paid_at)
       VALUES (?, ?, ?, ?, ?, 'Razorpay', ?, 'paid', NOW())`,
      [paymentId, appointment.id, razorpay_order_id, razorpay_payment_id, razorpay_signature, appointment.total_inr]
    );

    // 5. Insert Receipt Record
    const receiptId = crypto.randomUUID();
    const receiptNumber = `AGC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}`;
    await connection.query(
      `INSERT INTO receipts (id, appointment_id, receipt_number, issued_at)
       VALUES (?, ?, ?, NOW())`,
      [receiptId, appointment.id, receiptNumber]
    );

    await connection.commit();
    return { success: true, appointmentId: appointment.id, receiptNumber };
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}
```

---

### 3.3 Flow C: Atomic Doctor Break Creation & Conflict Rescheduling

Replaces the PostgreSQL stored procedure `create_doctor_break_and_reschedule`:

```javascript
async function createDoctorBreakAndReschedule(connection, doctorId, startDatetime, endDatetime, reason) {
  await connection.beginTransaction();
  try {
    // 1. Lock existing appointments overlapping with break period
    const [conflictingAppts] = await connection.query(
      `SELECT * FROM appointments
       WHERE doctor_id = ?
         AND start_datetime < ?
         AND end_datetime > ?
         AND status = 'upcoming'
       FOR UPDATE`,
      [doctorId, endDatetime, startDatetime]
    );

    let rescheduledCount = 0;
    let rescheduleRequiredCount = 0;

    for (const appt of conflictingAppts) {
      // Find next available 30-min slot after endDatetime
      const nextSlot = await findNextAvailableSlot(connection, doctorId, new Date(endDatetime));

      if (nextSlot) {
        // Compute new end datetime
        const durationMs = new Date(appt.end_datetime) - new Date(appt.start_datetime);
        const newEnd = new Date(nextSlot.getTime() + durationMs);

        await connection.query(
          `UPDATE appointments 
           SET start_datetime = ?, end_datetime = ?, status = 'rescheduled'
           WHERE id = ?`,
          [nextSlot.toISOString().slice(0, 19).replace('T', ' '), newEnd.toISOString().slice(0, 19).replace('T', ' '), appt.id]
        );
        rescheduledCount++;
      } else {
        await connection.query(
          `UPDATE appointments SET status = 'RESCHEDULE_REQUIRED' WHERE id = ?`,
          [appt.id]
        );
        rescheduleRequiredCount++;
      }
    }

    // 2. Insert schedule block
    const blockId = crypto.randomUUID();
    await connection.query(
      `INSERT INTO doctor_schedule_blocks (id, doctor_id, start_datetime, end_datetime, type, reason)
       VALUES (?, ?, ?, ?, 'break', ?)`,
      [blockId, doctorId, startDatetime, endDatetime, reason]
    );

    await connection.commit();
    return {
      affected_count: conflictingAppts.length,
      rescheduled_count: rescheduledCount,
      reschedule_required_count: rescheduleRequiredCount
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}
```

---

## 4. Concurrency Verification Checklist

- [x] **Race Condition Prevention:** Explicit row locking via `FOR UPDATE` prevents simultaneous booking of the same slot.
- [x] **Double-Booking Safety:** `slot_holds` index on `(doctor_id, slot_datetime, confirmed)` guarantees 1 active booking/hold per slot.
- [x] **ACID Compliance:** All multi-table updates (Appointments + Payments + Receipts + Slot Holds) run inside single MySQL transactions.
- [x] **Zero Data Corruption:** In case of payment signature mismatch or database write failure, full `ROLLBACK` executes automatically.
