-- =============================================================================
-- MediNest Healthcare Network — Production MySQL Database Schema
-- Compatible with MySQL 8.0+ / MariaDB 10.5+
-- Storage Engine: InnoDB | Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- =============================================================================

CREATE DATABASE IF NOT EXISTS medinest_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE medinest_db;

-- Disable foreign key checks during initialization
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. PROFILES (Extends Clerk / App Auth Users)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS profiles;
CREATE TABLE profiles (
  id            VARCHAR(255)  NOT NULL, -- Clerk User ID (e.g., 'user_2xyz...') or UUID
  role          ENUM('patient', 'doctor', 'admin') NOT NULL DEFAULT 'patient',
  full_name     VARCHAR(255)  NOT NULL,
  email         VARCHAR(255)  NOT NULL,
  phone         VARCHAR(50)   NULL,
  avatar_url    TEXT          NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  UNIQUE KEY uk_profiles_email (email),
  INDEX idx_profiles_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. DOCTOR PROFILES
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS doctor_profiles;
CREATE TABLE doctor_profiles (
  id                      VARCHAR(36)   NOT NULL, -- UUID string
  user_id                 VARCHAR(255)  NOT NULL, -- FK -> profiles.id
  registration_number     VARCHAR(100)  NOT NULL,
  name                    VARCHAR(255)  NOT NULL,
  gender                  ENUM('male', 'female', 'other') NOT NULL DEFAULT 'female',
  photo                   TEXT          NULL,
  specialty               VARCHAR(150)  NOT NULL,
  specialty_id            VARCHAR(100)  NOT NULL,
  qualifications          VARCHAR(255)  NOT NULL,
  experience_years        INT           NOT NULL DEFAULT 0,
  clinic_name             VARCHAR(255)  NOT NULL,
  clinic_address          TEXT          NOT NULL,
  city                    VARCHAR(100)  NOT NULL,
  fee_inr                 INT           NOT NULL DEFAULT 499,
  consultation_types      JSON          NOT NULL, -- Array: ["video", "clinic"]
  about                   TEXT          NULL,
  languages               JSON          NOT NULL, -- Array: ["Hindi", "English"]
  rating                  DECIMAL(3,1)  NOT NULL DEFAULT 4.8,
  review_count            INT           NOT NULL DEFAULT 10,
  verification_status     ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'verified',
  accepting_appointments  BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  UNIQUE KEY uk_doctor_user_id (user_id),
  UNIQUE KEY uk_doctor_reg_num (registration_number),
  INDEX idx_doctor_specialty_city (specialty_id, city),
  INDEX idx_doctor_verification (verification_status, accepting_appointments),
  CONSTRAINT fk_doctor_profile_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. DOCTOR AVAILABILITY RULES (Weekly Recurring Template)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS doctor_availability_rules;
CREATE TABLE doctor_availability_rules (
  id                    VARCHAR(36) NOT NULL, -- UUID string
  doctor_id             VARCHAR(36) NOT NULL, -- FK -> doctor_profiles.id
  weekday               ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  start_time            TIME        NOT NULL DEFAULT '09:00:00',
  end_time              TIME        NOT NULL DEFAULT '18:00:00',
  slot_duration_minutes INT         NOT NULL DEFAULT 30,
  created_at            DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  UNIQUE KEY uk_doctor_weekday (doctor_id, weekday),
  CONSTRAINT fk_availability_doctor FOREIGN KEY (doctor_id) REFERENCES doctor_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. DOCTOR SCHEDULE BLOCKS (Breaks, Leaves, Holidays, Blocked Slots)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS doctor_schedule_blocks;
CREATE TABLE doctor_schedule_blocks (
  id             VARCHAR(36)  NOT NULL, -- UUID string
  doctor_id      VARCHAR(36)  NOT NULL, -- FK -> doctor_profiles.id
  start_datetime DATETIME     NOT NULL,
  end_datetime   DATETIME     NOT NULL,
  type           ENUM('break', 'leave', 'holiday', 'blocked', 'reserved') NOT NULL DEFAULT 'break',
  reason         VARCHAR(255) NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  INDEX idx_blocks_doctor_dates (doctor_id, start_datetime, end_datetime),
  CONSTRAINT fk_blocks_doctor FOREIGN KEY (doctor_id) REFERENCES doctor_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. SLOT HOLDS (Temporary Lock During Razorpay Checkout - 10 Min TTL)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS slot_holds;
CREATE TABLE slot_holds (
  id            VARCHAR(36)  NOT NULL, -- UUID string
  doctor_id     VARCHAR(36)  NOT NULL, -- FK -> doctor_profiles.id
  slot_datetime DATETIME     NOT NULL,
  order_id      VARCHAR(100) NOT NULL, -- Razorpay order_id
  expires_at    DATETIME     NOT NULL,
  confirmed     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  UNIQUE KEY uk_slot_holds_order (order_id),
  INDEX idx_holds_doctor_slot (doctor_id, slot_datetime, confirmed),
  INDEX idx_holds_expiry (expires_at, confirmed),
  CONSTRAINT fk_holds_doctor FOREIGN KEY (doctor_id) REFERENCES doctor_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. APPOINTMENTS
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS appointments;
CREATE TABLE appointments (
  id                   VARCHAR(36)  NOT NULL, -- Format: 'MCI-APT-2026-XXXXX' or UUID
  patient_id           VARCHAR(255) NOT NULL, -- FK -> profiles.id
  doctor_id            VARCHAR(36)  NOT NULL, -- FK -> doctor_profiles.id
  consultation_type    ENUM('video', 'clinic') NOT NULL DEFAULT 'video',
  start_datetime       DATETIME     NOT NULL,
  end_datetime         DATETIME     NOT NULL,
  symptoms             TEXT         NULL,
  status               ENUM('upcoming', 'completed', 'cancelled', 'rescheduled', 'RESCHEDULE_REQUIRED') NOT NULL DEFAULT 'upcoming',
  payment_status       ENUM('pending', 'paid', 'refunded', 'failed') NOT NULL DEFAULT 'pending',
  total_inr            INT          NOT NULL,
  fee_inr              INT          NOT NULL,
  platform_fee_inr     INT          NOT NULL DEFAULT 0,
  taxes_inr            INT          NOT NULL DEFAULT 0,
  patient_name         VARCHAR(255) NOT NULL,
  patient_age          INT          NOT NULL,
  patient_gender       ENUM('Male', 'Female', 'Other') NOT NULL DEFAULT 'Male',
  patient_phone        VARCHAR(50)  NOT NULL,
  patient_email        VARCHAR(255) NOT NULL,
  video_link           TEXT         NULL,
  consultation_notes   TEXT         NULL,
  cancellation_reason  TEXT         NULL,
  razorpay_order_id    VARCHAR(100) NULL,
  razorpay_payment_id  VARCHAR(100) NULL,
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  INDEX idx_appointments_patient (patient_id, start_datetime),
  INDEX idx_appointments_doctor_slot (doctor_id, start_datetime, end_datetime, status),
  INDEX idx_appointments_razorpay_order (razorpay_order_id),
  CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id) REFERENCES doctor_profiles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. PAYMENTS
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS payments;
CREATE TABLE payments (
  id                    VARCHAR(36)  NOT NULL, -- UUID string
  appointment_id        VARCHAR(36)  NOT NULL, -- FK -> appointments.id
  razorpay_order_id     VARCHAR(100) NULL,
  razorpay_payment_id   VARCHAR(100) NULL,
  razorpay_signature    VARCHAR(255) NULL,
  payment_method        ENUM('UPI', 'Card', 'Net Banking', 'Wallet', 'Razorpay', 'Demo') NOT NULL DEFAULT 'Razorpay',
  amount_inr            INT          NOT NULL,
  status                ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'paid',
  paid_at               DATETIME     NULL,
  created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  INDEX idx_payments_appointment (appointment_id),
  INDEX idx_payments_razorpay (razorpay_order_id, razorpay_payment_id),
  CONSTRAINT fk_payments_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. RECEIPTS
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS receipts;
CREATE TABLE receipts (
  id             VARCHAR(36)  NOT NULL, -- UUID string
  appointment_id VARCHAR(36)  NOT NULL, -- FK -> appointments.id
  receipt_number VARCHAR(100) NOT NULL, -- e.g., 'AGC-2026-89421'
  issued_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  UNIQUE KEY uk_receipt_number (receipt_number),
  UNIQUE KEY uk_receipt_appointment (appointment_id),
  CONSTRAINT fk_receipts_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. NOTIFICATIONS
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
  id         VARCHAR(36)  NOT NULL, -- UUID string
  user_id    VARCHAR(255) NOT NULL, -- FK -> profiles.id
  title      VARCHAR(255) NOT NULL,
  message    TEXT         NOT NULL,
  type       ENUM('info', 'success', 'warning', 'error') NOT NULL DEFAULT 'info',
  read_at    DATETIME     NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  INDEX idx_notifications_user_read (user_id, read_at),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. SAVED DOCTORS (Patient Bookmarks / Favorites)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS saved_doctors;
CREATE TABLE saved_doctors (
  id          VARCHAR(36)  NOT NULL, -- UUID string
  patient_id  VARCHAR(255) NOT NULL, -- FK -> profiles.id
  doctor_id   VARCHAR(36)  NOT NULL, -- FK -> doctor_profiles.id
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  UNIQUE KEY uk_patient_doctor (patient_id, doctor_id),
  INDEX idx_saved_patient (patient_id),
  INDEX idx_saved_doctor (doctor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
