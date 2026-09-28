# MediNest — Supabase Migration & Architecture Analysis Report

**Generated Date:** September 28, 2026  
**Project Name:** MediNest (formerly Aarogya Care)  
**Project Path:** `c:\Users\Admin\Desktop\doctor\medinest`

---

## 1. Current Architecture

MediNest is a full-featured healthcare appointment and telehealth platform built with a client-heavy React single-page application (SPA) architecture coupled with Supabase for backend services (Auth, Database, Realtime, and Edge Functions).

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                 FRONTEND (SPA)                                   │
│  React 19 + TypeScript + Vite 6 + Tailwind CSS 4 + Lucide Icons + Motion         │
│                                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐                │
│  │  Patient Portal  │  │  Doctor Portal   │  │  Admin Portal   │                │
│  │ (Auth & Booking) │  │(Schedule & Rx)   │  │ (Verification)  │                │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬────────┘                │
└───────────┼─────────────────────┼─────────────────────┼──────────────────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          ISOLATED CLIENT LAYER (src/lib/)                        │
│  patientSupabase          doctorSupabase          adminSupabase                  │
│  (medinest_patient_auth) (medinest_doctor_auth) (medinest_admin_auth)            │
└───────────┬─────────────────────┬─────────────────────┬──────────────────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE CLOUD SERVICES (rjacrstbafbfcsovgehz)           │
│  • PostgreSQL DB (Profiles, Doctors, Appointments, Slots, Payments, Receipts)  │
│  • GoTrue Auth (Email/Password authentication per role)                          │
│  • Realtime (Doctor schedule block changes & slot hold synchronization)          │
│  • Edge Functions (Deno):                                                         │
│     - create-razorpay-order                                                      │
│     - verify-razorpay-payment                                                    │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Current Project Structure

```
medinest/
├── .env                                # Production/Dev Supabase & App Config
├── .env.example                        # Env variable template
├── .env.local                          # Local Razorpay public key (Git-ignored)
├── .gitignore                          # Git ignore rules
├── index.html                          # HTML entry point (MediNest branding & metadata)
├── metadata.json                       # Application metadata
├── package.json                        # Dependencies & build scripts
├── package-lock.json                   # Lockfile
├── README.md                           # Documentation
├── seed-real-accounts.ts               # Supabase Auth Seeding Script
├── test-all-7-requirements.ts          # Verification test script
├── test-all-8-accounts.ts              # Account integrity verification script
├── test-auth.ts                        # Authentication verification script
├── tsconfig.json                       # TypeScript configuration
├── vite.config.ts                      # Vite configuration (Port 3000, 0.0.0.0 host)
├── src/
│   ├── App.tsx                         # Primary routing, global state, single-session guard
│   ├── index.css                       # Tailwind imports & theme styles
│   ├── types.ts                        # Core TypeScript models (Doctor, Appointment, etc.)
│   ├── assets/
│   │   └── images/                     # Hero & Auth banner assets
│   ├── components/                     # Core React Components
│   │   ├── AboutSection.tsx            # About MediNest section
│   │   ├── AdminAuthModal.tsx          # Admin authentication modal
│   │   ├── AdminPortalView.tsx         # Admin dashboard (Doctor verification, system stats)
│   │   ├── AuthModal.tsx               # Patient authentication modal
│   │   ├── BookingPaymentModal.tsx     # Razorpay & slot booking flow modal
│   │   ├── DoctorAuthModal.tsx         # Doctor registration & login modal
│   │   ├── DoctorAvatar.tsx            # Avatar renderer component
│   │   ├── DoctorIllustration.tsx      # Visual illustration component
│   │   ├── DoctorList.tsx              # Doctor directory listing with filtering
│   │   ├── DoctorPortalView.tsx        # Doctor dashboard root container
│   │   ├── DoctorProfileModal.tsx      # Public doctor profile & slot selection modal
│   │   ├── FAQSection.tsx              # Frequently asked questions
│   │   ├── Footer.tsx                  # MediNest footer
│   │   ├── Hero.tsx                    # Landing hero section
│   │   ├── HowItWorks.tsx              # Platform guide section
│   │   ├── MediNestLogo.tsx            # SVG MediNest logo component
│   │   ├── Navbar.tsx                  # Role-aware navigation header
│   │   ├── PatientTestimonials.tsx     # Patient reviews section
│   │   ├── ReceiptModal.tsx            # Sticky toolbar PDF receipt viewer modal (Z-Index 100)
│   │   ├── SpecialtyGrid.tsx           # Specialty selection grid
│   │   ├── SymptomCheckerModal.tsx     # Clinical AI Symptom Checker & Specialty guide
│   │   ├── TrustSection.tsx            # Platform trust indicators
│   │   ├── UserDashboardModal.tsx      # Patient appointment & prescription dashboard
│   │   └── doctor/                     # Sub-components for Doctor Portal
│   │       ├── DoctorAppointmentsTab.tsx # Doctor's upcoming/past consultations tab
│   │       ├── DoctorEarningsTab.tsx     # Financial earnings and payout metrics
│   │       ├── DoctorPatientsTab.tsx     # Patient records & consultation history
│   │       ├── DoctorPrescriptionModal.tsx # Prescription generator with NMC compliance
│   │       ├── DoctorProfileTab.tsx      # Doctor bio, qualification, fee editor
│   │       ├── DoctorScheduleTab.tsx     # Slot availability, break conflict RPC, realtime
│   │       └── DoctorVideoRoomModal.tsx  # Telehealth video room container
│   ├── data/
│   │   ├── doctorPortalData.ts         # Initial mock/fallback doctor dashboard metrics
│   │   ├── doctorsData.ts              # Fallback static doctor database
│   │   ├── specialtiesData.ts          # Medical specialties list & icons
│   │   └── symptomsKnowledge.ts        # Symptom-to-specialty clinical rule engine
│   └── lib/
│       ├── appointments.ts             # Supabase appointment creation & fetching logic
│       ├── doctors.ts                  # Doctor profile fetcher (Supabase + fallback)
│       ├── prescriptions.ts            # jsPDF A4 e-Prescription PDF generator
│       ├── razorpay.ts                 # Razorpay Checkout JS launcher & Edge Function caller
│       ├── receipts.ts                 # jsPDF A4 GST Tax Receipt PDF generator
│       ├── slots.ts                    # Realtime slot calculation & block engine
│       └── supabase.ts                 # Isolated Supabase clients (Patient, Doctor, Admin)
└── supabase/
    ├── seed.sql                        # SQL database seed script
    ├── functions/                      # Deno Edge Functions
    │   ├── create-razorpay-order/
    │   │   └── index.ts                # Creates Razorpay order & slot hold server-side
    │   └── verify-razorpay-payment/
    │       └── index.ts                # Verifies Razorpay HMAC signature & confirms booking
    └── migrations/                     # SQL Migrations
        ├── 001_initial_schema.sql      # Core table definitions
        ├── 002_rls_policies.sql        # Row-level security policies
        ├── 007_seed_development_accounts.sql # Dev test accounts
        ├── 008_admin_rls_policies.sql  # Admin role RLS policies
        └── 20260912_razorpay_slot_holds.sql # Slot hold schema & atomic reschedule RPCs
```

---

## 3. Existing Customizations & Changes Already Implemented

The following major features and fixes have **already been added** to the project and must **NOT** be discarded or reset:

1. **Brand Re-branding (MediNest):**
   - Brand name updated from "Aarogya Care" to "MediNest" across all HTML files, navbar, footers, auth modals, PDF receipts, prescriptions, and Razorpay payment parameters.
   - Tagline updated to: *"Simple access to care, anytime, anywhere."*

2. **Receipt Download Modal Z-Index Fix (`src/components/ReceiptModal.tsx`):**
   - Enhanced modal overlay with `z-[100] bg-slate-900/70 backdrop-blur-md`.
   - Rendered at top-level DOM hierarchy after `<UserDashboardModal>` in `App.tsx` so receipt previews sit reliably above the Patient Dashboard.
   - Sticky top toolbar containing Close "X", Download PDF, and Print buttons.

3. **Single Active Role Session Isolation (`src/App.tsx`):**
   - Enforced single active role per browser: logging into Doctor portal automatically signs out Patient/Admin sessions; logging into Admin portal signs out Patient/Doctor; logging into Patient signs out Doctor/Admin.
   - Preserves security contracts and prevents role bleeding.

4. **Role-Aware Navbar Controls (`src/components/Navbar.tsx`):**
   - Doctor Portal and Admin links are dynamically hidden when a Patient is actively logged in.

5. **Realtime Doctor Slot & Schedule Engine (`src/lib/slots.ts` & `DoctorScheduleTab.tsx`):**
   - Doctor date selector passes exact ISO string (`nextDays[selectedDateIndex].isoString`).
   - Realtime Supabase channels set up to listen for additions/deletions on `doctor_schedule_blocks`, `appointments`, and `slot_holds`.
   - Clear slot status legend: `AVAILABLE`, `SELECTED`, `BOOKED`, `ON BREAK`, `BLOCKED / LEAVE`, `PAYMENT PENDING`, `EXPIRED`.

6. **Atomic Rescheduling & Break Conflict RPC (`supabase/migrations/20260912_razorpay_slot_holds.sql`):**
   - Database functions `check_break_conflicts` and `create_doctor_break_and_reschedule` execute break insertion and existing appointment rescheduling inside a single PL/pgSQL transaction.

7. **Server-Side Razorpay Payment Integration (`supabase/functions/`):**
   - `create-razorpay-order` Edge Function creates Razorpay order and reserves slot hold.
   - `verify-razorpay-payment` Edge Function verifies HMAC-SHA256 signature using `RAZORPAY_KEY_SECRET` before confirming appointment.

---

## 4. Comprehensive Supabase Dependency & Reference Map

### A. Dependencies in `package.json`
- `"@supabase/supabase-js": "^2.116.0"`

### B. Supabase Environment Variables
- `VITE_SUPABASE_URL`: `"https://rjacrstbafbfcsovgehz.supabase.co"`
- `VITE_SUPABASE_ANON_KEY`: `"eyJhbGciOiJIUzI... (Anon Key)"`

### C. Supabase Clients (`src/lib/supabase.ts`)
1. `patientSupabase`: Storage key `medinest_patient_auth`
2. `doctorSupabase`: Storage key `medinest_doctor_auth`
3. `adminSupabase`: Storage key `medinest_admin_auth`

### D. Supabase Tables & Usage

| Table Name | Operations (SELECT / INSERT / UPDATE / DELETE) | File References |
| :--- | :--- | :--- |
| `profiles` | `select`, `upsert` | `App.tsx`, `AuthModal.tsx`, `DoctorAuthModal.tsx`, `AdminAuthModal.tsx` |
| `doctor_profiles` | `select`, `update` | `App.tsx`, `doctors.ts`, `DoctorProfileModal.tsx`, `DoctorProfileTab.tsx` |
| `appointments` | `select`, `insert`, `update` | `appointments.ts`, `slots.ts`, `DoctorPortalView.tsx`, `DoctorScheduleTab.tsx` |
| `payments` | `insert` | `appointments.ts`, `verify-razorpay-payment/index.ts` |
| `receipts` | `insert` | `receipts.ts` |
| `doctor_availability_rules` | `select`, `upsert` | `slots.ts`, `DoctorScheduleTab.tsx` |
| `doctor_schedule_blocks` | `select`, `insert`, `delete` | `slots.ts`, `DoctorScheduleTab.tsx` |
| `slot_holds` | `select`, `insert`, `update` | `slots.ts`, `create-razorpay-order`, `verify-razorpay-payment` |

### E. Supabase RPC / Stored Procedures Called
1. `doctorSupabase.rpc('check_break_conflicts', ...)` in `DoctorScheduleTab.tsx`
2. `doctorSupabase.rpc('create_doctor_break_and_reschedule', ...)` in `DoctorScheduleTab.tsx`

---

## 5. Third-Party & Alternative Backend Inspection

- **Clerk Authentication:**
  - **Status:** NOT PRESENT. Zero `@clerk/*` packages exist in `package.json` or source code.
- **Node.js / Express Backend:**
  - **Status:** Package present (`express` ^4.21.2), but NO `server.js` or backend route handler code currently exists in repository.
- **MySQL Database:**
  - **Status:** NOT PRESENT. Zero MySQL drivers or configuration files exist.
- **Gemini AI:**
  - **Status:** Package present (`@google/genai` ^2.4.0). Clinical rule engine implemented in `src/data/symptomsKnowledge.ts` and UI in `SymptomCheckerModal.tsx`.
- **Leaflet / Maps:**
  - **Status:** Address and location rendered via standard text and Lucide `MapPin` icons.
- **PDF Generation:**
  - **Status:** `jspdf` ^4.2.1 used in `src/lib/receipts.ts` and `src/lib/prescriptions.ts`.

---

## 6. Migration Classification Map

### What Will Be Preserved (100% Retained)
- Entire frontend UI layout, tailwind styling, modals, and user flows.
- MediNest branding, logo, and copy.
- jsPDF generation logic for Tax Receipts (`receipts.ts`) and NMC e-Prescriptions (`prescriptions.ts`).
- Clinical AI Symptom Checker UI (`SymptomCheckerModal.tsx`) and knowledge rules (`symptomsKnowledge.ts`).
- Doctor video consultation room container (`DoctorVideoRoomModal.tsx`).
- Client-side Razorpay modal trigger (`razorpay.ts`).
- Static data fallbacks (`doctorsData.ts`, `specialtiesData.ts`, `doctorPortalData.ts`).

### What Needs to Be Migrated / Addressed
- If migrating away from Supabase:
  - **Auth Layer:** Replace GoTrue auth (`@supabase/supabase-js`) in `AuthModal.tsx`, `DoctorAuthModal.tsx`, `AdminAuthModal.tsx`, `App.tsx` with targeted Auth provider or local session manager.
  - **Database Layer:** Replace PostgREST database queries in `appointments.ts`, `doctors.ts`, `slots.ts`, `DoctorScheduleTab.tsx` with targeted database API / REST endpoints.
  - **Realtime Layer:** Replace Supabase Realtime channels in `DoctorScheduleTab.tsx` with WebSockets or Polling.
  - **Edge Functions:** Replace Razorpay Deno Edge Functions with standard Node.js Express server routes.
  - **RPC Transactions:** Port PL/pgSQL procedures (`create_doctor_break_and_reschedule`) to database transactions.

---

## 7. Recommended Migration / Modification Order

1. **Step 1: Backend / API Specification:** Define exact API contracts for Auth, Doctors, Appointments, Slots, and Payments.
2. **Step 2: Service Abstraction (`src/lib/`):** Create an abstract service layer in `src/lib/` separating data fetching from Supabase specific SDK calls.
3. **Step 3: Auth Provider Integration:** Swap auth listeners in `App.tsx` and modal components.
4. **Step 4: Data Layer Migration:** Update `doctors.ts`, `appointments.ts`, `slots.ts`.
5. **Step 5: Realtime & Server-Side Functions:** Port Edge Functions (`create-razorpay-order`, `verify-razorpay-payment`) to Node/Express backend if needed.
6. **Step 6: End-to-End Verification:** Test all 3 portals (Patient, Doctor, Admin), slot booking, Razorpay checkout, and PDF downloads.

---

## 8. Potential Breaking Changes & Technical Risks

> [!WARNING]
> **Risk 1: Role Session Isolation Breakage**  
> If session state management is altered without preserving the `medinest_patient_auth`, `medinest_doctor_auth`, and `medinest_admin_auth` isolation, logging in as a Doctor could pollute the Patient session.

> [!IMPORTANT]
> **Risk 2: Slot Double-Booking Race Conditions**  
> Slot reservation currently relies on Supabase Realtime and `slot_holds` table with automatic expiration. Any backend change must enforce atomic locking or transaction holds during Razorpay payment processing.

> [!CAUTION]
> **Risk 3: Razorpay Secret Exposure**  
> `RAZORPAY_KEY_SECRET` must NEVER be exposed to browser code. Razorpay signature verification (`HMAC-SHA256`) must strictly occur in secure server-side execution environments.

---

## 9. Next Steps

This report (`SUPABASE_MIGRATION_ANALYSIS.md`) has been created.  
**No code modifications have been made to the application.**  

*Please review this analysis report and provide approval or further instructions before proceeding to implementation.*
