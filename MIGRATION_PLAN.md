# MediNest — Migration Baseline & Architectural Plan

**Document Version:** 1.0  
**Generated Date:** September 28, 2026  
**Target Stack:** React 19 + TypeScript + Vite + Tailwind CSS 4 | Node.js + Express.js | Clerk Auth | MySQL Database | Razorpay | Gemini AI Engine

---

## 1. Executive Summary & Objective

This document defines the comprehensive migration baseline for transitioning the **MediNest** healthcare application from its current Supabase cloud backend to a custom, self-hosted Node.js + Express.js backend with MySQL database and Clerk authentication.

All existing business logic, MediNest branding, UI components, PDF generators, Gemini clinical rule engine, single-session role guards, and Razorpay checkout flows will be 100% preserved.

---

## 2. Component Mapping Matrix (Supabase → Target Stack)

| Current Supabase Component | Target Replacement | Technical Implementation Strategy |
| :--- | :--- | :--- |
| **Supabase Auth (GoTrue)** | **Clerk Authentication** | `@clerk/clerk-react` on frontend, `@clerk/express` on backend. Roles (`patient`, `doctor`, `admin`) mapped via Clerk `publicMetadata` / custom claims. Role isolation preserved. |
| **Supabase PostgreSQL** | **MySQL Database (v8.0+)** | InnoDB engine, strict foreign keys, indexes on `start_datetime`, `doctor_id`, `patient_id`. ACID transactions for booking & rescheduling. |
| **Supabase Client Queries (`@supabase/supabase-js`)** | **Express REST APIs** | Modular Express routing (`/api/v1/doctors`, `/api/v1/appointments`, `/api/v1/slots`, `/api/v1/prescriptions`, `/api/v1/payments`). |
| **Supabase Edge Functions (`create-razorpay-order`, `verify-razorpay-payment`)** | **Express Controllers & Services** | Dedicated Node.js Razorpay controller (`/api/v1/payments/create-order`, `/api/v1/payments/verify-payment`) with server-side `RAZORPAY_KEY_SECRET`. |
| **Supabase Row-Level Security (RLS)** | **Express Auth Middleware** | Custom JWT verification middleware (`authMiddleware`) & role guards (`requireRole('patient')`, `requireRole('doctor')`, `requireRole('admin')`). |
| **Supabase Realtime (Channels)** | **UI Refresh / Polling** | Deferred as specified. No WebSockets or Socket.IO added at this stage. Slot availability refreshed on date pick and post-action updates. |
| **PL/pgSQL Rescheduling Procedure** | **Node.js Service + MySQL Transaction** | `SELECT ... FOR UPDATE` explicit row-locking within MySQL `START TRANSACTION ... COMMIT` to prevent double bookings & schedule overlaps. |
| **Supabase Storage (Asset URLs)** | **Static Express Assets / Public Dir** | Local static asset serving or cloud CDN URL placeholders. |

---

## 3. Detailed Component Migration Baseline

### 3.1 Authentication & User Management (Supabase GoTrue → Clerk)
- **Current Behavior:** `src/lib/supabase.ts` instantiates 3 isolated clients (`patientSupabase`, `doctorSupabase`, `adminSupabase`) with distinct local storage keys (`medinest_patient_auth`, `medinest_doctor_auth`, `medinest_admin_auth`).
- **Target Replacement:**
  - Integrated Clerk React SDK (`<ClerkProvider>`).
  - Clerk user profiles synced with MySQL `profiles` table using Clerk webhooks (`user.created`, `user.updated`).
  - Role management stored in Clerk `publicMetadata: { role: 'patient' | 'doctor' | 'admin' }`.
  - Frontend auth listeners in `App.tsx` updated to use `useUser()` and `useAuth()` from Clerk.

### 3.2 Database Layer (PostgreSQL → MySQL Schema)
- **Tables Mapped:**
  1. `profiles`: `id` (VARCHAR/Clerk User ID), `email`, `role`, `full_name`, `phone`, `avatar_url`, `created_at`, `updated_at`.
  2. `doctor_profiles`: `id` (VARCHAR), `user_id` (FK -> profiles.id), `name`, `gender`, `specialty`, `specialty_id`, `qualifications`, `experience_years`, `clinic_name`, `clinic_address`, `city`, `languages` (JSON), `rating`, `review_count`, `fee_inr`, `consultation_types` (JSON), `about`, `registration_number`, `verification_status`, `accepting_appointments`, `created_at`.
  3. `appointments`: `id` (VARCHAR), `patient_id` (FK), `doctor_id` (FK), `consultation_type`, `start_datetime` (DATETIME), `end_datetime` (DATETIME), `symptoms`, `status`, `payment_status`, `total_inr`, `fee_inr`, `platform_fee_inr`, `taxes_inr`, `patient_name`, `patient_age`, `patient_gender`, `patient_phone`, `patient_email`, `video_link`, `cancellation_reason`, `created_at`.
  4. `payments`: `id`, `appointment_id` (FK), `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`, `payment_method`, `amount_inr`, `status`, `paid_at`.
  5. `receipts`: `id`, `appointment_id` (FK), `receipt_number`, `issued_at`.
  6. `doctor_availability_rules`: `id`, `doctor_id` (FK), `weekday`, `start_time` (TIME), `end_time` (TIME), `slot_duration_minutes`.
  7. `doctor_schedule_blocks`: `id`, `doctor_id` (FK), `start_datetime` (DATETIME), `end_datetime` (DATETIME), `type` ('break' | 'leave'), `reason`.
  8. `slot_holds`: `id`, `doctor_id` (FK), `slot_datetime` (DATETIME), `hold_token`, `expires_at` (DATETIME), `confirmed` (BOOLEAN).

### 3.3 Express REST API Service Layer
- Structure under `backend/`:
  - `backend/server.js`: Express app entry point.
  - `backend/config/db.js`: MySQL connection pool (`mysql2/promise`).
  - `backend/middleware/auth.js`: Clerk token verification & role enforcement.
  - `backend/controllers/`: `doctorsController.js`, `appointmentsController.js`, `slotsController.js`, `paymentsController.js`.
  - `backend/routes/`: Express route definitions.

### 3.4 Concurrency & Atomic Rescheduling Strategy (Node.js + MySQL)
- Replaces PL/pgSQL function `create_doctor_break_and_reschedule`.
- Employs MySQL `START TRANSACTION`:
  1. `SELECT * FROM doctor_schedule_blocks WHERE doctor_id = ? AND ... FOR UPDATE;`
  2. `SELECT * FROM appointments WHERE doctor_id = ? AND start_datetime < ? AND end_datetime > ? FOR UPDATE;`
  3. Inserts break block into `doctor_schedule_blocks`.
  4. Automatically reschedules conflicting appointments to the next available slot or marks them for rescheduling.
  5. `COMMIT;`

### 3.5 Razorpay Payment Processing
- Express endpoints:
  - `POST /api/v1/payments/create-order`: Generates Razorpay Order via `razorpay` npm package and inserts a temporary `slot_holds` record in MySQL.
  - `POST /api/v1/payments/verify`: Verifies `crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)` signature, updates `slot_holds.confirmed = true`, inserts record into `appointments` and `payments` tables atomically inside a MySQL transaction.

---

## 4. Phase Execution Roadmap

- **Phase 0:** Preserve Current Work *(COMPLETED)*
- **Phase 1:** Create Migration Baseline (`MIGRATION_PLAN.md`) *(COMPLETED)*
- **Phase 2:** Design MySQL Database Only (`backend/database/schema.sql`, `README.md`, `APPOINTMENT_CONCURRENCY_DESIGN.md`)
- **Phase 3:** Express Backend & API Implementation
- **Phase 4:** Clerk Authentication Integration
- **Phase 5:** Frontend Data Access Layer Migration (`src/lib/`)
- **Phase 6:** End-to-End Testing & Supabase Removal

---

## 5. Risk Assessment & Verification Strategy

1. **Transaction Isolation Risk:** Concurrent slot bookings could collide if `SELECT ... FOR UPDATE` is omitted during Razorpay order creation and payment verification.
2. **Role Bleeding Risk:** Clerk user metadata must strictly distinguish between `patient`, `doctor`, and `admin` users to preserve active role session guards.
3. **Secret Protection:** `RAZORPAY_KEY_SECRET` and `CLERK_SECRET_KEY` must remain strictly server-side in `.env` (never exposed to Vite/bundle).
