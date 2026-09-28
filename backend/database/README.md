# MediNest Database Documentation (MySQL)

This directory contains the database migration DDL schema and documentation for the **MediNest** healthcare platform MySQL database.

---

## 1. Prerequisites & Environment Setup

- **MySQL Version:** 8.0+ or MariaDB 10.5+
- **Default Database Name:** `medinest_db`
- **Default Port:** `3306`
- **Character Set:** `utf8mb4`
- **Collation:** `utf8mb4_unicode_ci`

### Quick Database Setup Command

Run the following command in PowerShell / Terminal to create and initialize the database schema:

```bash
mysql -u root -p < backend/database/schema.sql
```

---

## 2. Environment Variables Configuration (`.env`)

Add the following MySQL configuration variables to your backend `.env` file:

```env
# MySQL Database Connection Pool
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_secure_password
MYSQL_DATABASE=medinest_db
MYSQL_CONNECTION_LIMIT=20
```

---

## 3. Entity Relationship Overview (ERD)

```
┌──────────────┐         1:1         ┌──────────────────┐
│   profiles   ├────────────────────►│  doctor_profiles │
└──────┬───────┘                     └────────┬─────────┘
       │                                      │
       │ 1:N                                  │ 1:N
       ▼                                      ▼
┌──────────────┐                     ┌──────────────────┐
│ appointments │◄────────────────────┤   slot_holds     │
└──────┬───────┘                     └──────────────────┘
       │
       ├─────────────────┬──────────────────┐
       │ 1:1             │ 1:N              │ 1:1
       ▼                 ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   receipts   │  │   payments   │  │notifications │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 4. Key Table Summaries

| Table | Description | Key Indexes |
| :--- | :--- | :--- |
| `profiles` | Stores Patient, Doctor, and Admin accounts linked to Clerk User IDs. | `PRIMARY KEY (id)`, `UNIQUE (email)` |
| `doctor_profiles` | Detailed doctor bio, fees, specialty, qualifications, and city. | `PRIMARY KEY (id)`, `INDEX (specialty_id, city)` |
| `appointments` | Booked patient consultations with datetime, status, and fee breakdown. | `INDEX (doctor_id, start_datetime, status)` |
| `slot_holds` | Temporary 10-min reservation lock created during Razorpay checkout. | `UNIQUE (order_id)`, `INDEX (expires_at, confirmed)` |
| `doctor_schedule_blocks` | Doctor breaks, leaves, and emergency schedule blocks. | `INDEX (doctor_id, start_datetime, end_datetime)` |
| `doctor_availability_rules` | Weekly recurring templates (e.g. Mon-Fri 9 AM - 6 PM, 30m slots). | `UNIQUE (doctor_id, weekday)` |
| `payments` | Financial transactions linked to Razorpay payments & appointments. | `INDEX (appointment_id)` |
| `receipts` | Tax invoice receipts generated after payment confirmation. | `UNIQUE (receipt_number)` |
