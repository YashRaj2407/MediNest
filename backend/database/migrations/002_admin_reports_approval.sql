-- =============================================================================
-- MediNest Migration 002: Admin Management, Doctor Approval, Doctor Reports
-- Run via: Get-Content ... | mysql -u root -p240407 medinest_db
-- =============================================================================

USE medinest_db;

-- 1. Add account_status to profiles (ignore if already exists)
ALTER TABLE profiles 
  ADD COLUMN account_status ENUM('active','deactivated','deleted') NOT NULL DEFAULT 'active' AFTER role;

-- 2a. Expand verification_status enum to include approved/suspended
ALTER TABLE doctor_profiles
  MODIFY COLUMN verification_status ENUM('pending','verified','approved','rejected','suspended') NOT NULL DEFAULT 'pending';

-- 2b. Add approval columns to doctor_profiles
ALTER TABLE doctor_profiles
  ADD COLUMN approval_reason TEXT NULL AFTER verification_status,
  ADD COLUMN approved_by VARCHAR(255) NULL AFTER approval_reason,
  ADD COLUMN approved_at DATETIME NULL AFTER approved_by,
  ADD COLUMN suspension_reason TEXT NULL AFTER approved_at;

-- 3. Audit log table
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id           VARCHAR(36)  NOT NULL,
  admin_id     VARCHAR(255) NOT NULL,
  action       VARCHAR(100) NOT NULL,
  target_type  VARCHAR(50)  NOT NULL,
  target_id    VARCHAR(255) NOT NULL,
  prev_status  VARCHAR(100) NULL,
  new_status   VARCHAR(100) NULL,
  reason       TEXT         NULL,
  metadata     JSON         NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_audit_admin    (admin_id),
  INDEX idx_audit_target   (target_type, target_id),
  INDEX idx_audit_created  (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Doctor reports table
CREATE TABLE IF NOT EXISTS doctor_reports (
  id              VARCHAR(36)  NOT NULL,
  patient_id      VARCHAR(255) NOT NULL,
  doctor_id       VARCHAR(36)  NOT NULL,
  category        ENUM(
    'unprofessional_behaviour',
    'missed_appointment',
    'false_credentials',
    'billing_issue',
    'inappropriate_conduct',
    'other'
  ) NOT NULL,
  description     TEXT         NOT NULL,
  evidence_url    TEXT         NULL,
  status          ENUM('open','under_review','resolved','dismissed') NOT NULL DEFAULT 'open',
  admin_notes     TEXT         NULL,
  resolved_reason TEXT         NULL,
  resolved_by     VARCHAR(255) NULL,
  resolved_at     DATETIME     NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_reports_patient  (patient_id),
  INDEX idx_reports_doctor   (doctor_id),
  INDEX idx_reports_status   (status),
  INDEX idx_reports_created  (created_at),
  CONSTRAINT fk_reports_patient FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_reports_doctor  FOREIGN KEY (doctor_id)  REFERENCES doctor_profiles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
