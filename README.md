# MediNest - Dual-Database Healthcare Platform (MySQL + MongoDB)

MediNest is a full-stack digital healthcare application providing doctor discovery, appointment booking, payments, verified prescriptions, emergency SOS services, and an AI-powered clinical assistant.

---

## 🏗️ Dual-Database Architecture Overview

MediNest utilizes a clean, resilient hybrid database architecture with clear separation of responsibilities:

| Database | Technology | Primary Responsibilities | Data Stored |
| :--- | :--- | :--- | :--- |
| **Relational Data** | **MySQL** (`mysql2/promise`) | Relational transactional integrity, financial auditing, patient & doctor identities | • Patients & Doctor Profiles<br>• Appointments & Slots<br>• Payments & GST Invoices<br>• Prescriptions & Reports<br>• Audit Logs |
| **Conversational Data** | **MongoDB** (`mongoose`) | Flexible document storage for multi-turn clinical chat sessions and AI metadata | • Consultation Sessions<br>• User/Guest Conversation Turns<br>• AI Assistant Clinical Guidance<br>• Specialist Recommendations<br>• Message Timestamps & Metadata |

> **Privacy & Security Guarantee:** MongoDB strictly stores chat conversation turns and triage metadata. Passwords, payment card details, auth tokens, and full patient medical records are **never** stored in MongoDB.

---

## 🛠️ Windows MongoDB Environment & Verification

### Prerequisites
- **MongoDB Community Server** (v8.x+, e.g. 8.3.7) running locally on port 27017.
- **MongoDB Shell** (`mongosh` v2.x+).
- **Node.js** (v20+ or v24+).
- **MySQL Server** running locally on port 3306 with database `medinest`.

### Windows Verification Commands

1. **Verify MongoDB Service is Running:**
   ```powershell
   Get-Service -Name MongoDB
   ```

2. **Verify Server Version:**
   ```powershell
   mongod --version
   ```

3. **Verify Shell & Connect to `medinest` Database:**
   ```powershell
   mongosh "mongodb://127.0.0.1:27017/medinest"
   ```

4. **Inspect Databases and Collections in `mongosh`:**
   ```javascript
   show dbs
   use medinest
   show collections
   db.conversations.countDocuments()
   db.conversations.find({}, { title: 1, ownerUserId: 1, "messages.role": 1, updatedAt: 1 }).pretty()
   ```

---

## ⚙️ Environment Configuration

Ensure your `.env` or `.env.local` contains:

```env
# Server Port
PORT=5000

# Relational Database (MySQL)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=medinest

# Document Database (MongoDB)
MONGODB_URI=mongodb://127.0.0.1:27017/medinest

# AI Clinical Guidance (Optional - Falls back to Clinical Rules Engine if omitted)
GEMINI_API_KEY=your_gemini_api_key

# Security & Admin Secret
ADMIN_SECRET_TOKEN=medinest_admin_secret_token_2026
```

---

## 🚀 Running the Application

### 1. Start the Express Backend API
```bash
npm run server
```
*Backend runs on `http://localhost:5000`.*
- MySQL connection pool initialized via `backend/config/db.js`.
- MongoDB connection initialized asynchronously via `backend/config/mongodb.js`.
- Graceful startup: If MongoDB is temporarily offline, Express and MySQL continue operating normally.

### 2. Start the Frontend (Vite + React)
```bash
npm run dev
```
*Frontend runs on `http://localhost:3000`.*

---

## 🧪 Automated Testing

MediNest includes dedicated automated test suites covering both databases:

### Run Relational (MySQL) Platform Test Suite (87 Tests)
```bash
npm test
```
*Executes `backend/test_suite.js` covering authentication, doctor verification, appointment booking, payments, identity isolation, and prescription workflows.*

### Run Document (MongoDB) AI Chat Test Suite (14 Tests)
```bash
npm run test:mongo
```
*Executes `backend/test_chat_mongodb.js` covering direct connection, Mongoose schema validation, API endpoints, privacy isolation, and resilience.*

### Run Frontend TypeScript Compilation & Build Check
```bash
npm run lint
npm run build
```

---

## 📡 MongoDB AI Chat REST API Endpoints

All chat endpoints are mounted under `/api/v1/chat`:

| Method | Endpoint | Description | Auth / Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/chat/status` | Health & connection check for MongoDB chat service | Public |
| `POST` | `/api/v1/chat/conversations` | Start a new clinical conversation session | User / Guest |
| `GET` | `/api/v1/chat/conversations` | List conversation history for authenticated user or guest | User / Guest |
| `GET` | `/api/v1/chat/conversations/:id` | Fetch full message history of a consultation session | Owner / Admin |
| `POST` | `/api/v1/chat/conversations/:id/messages` | Append message, invoke AI clinical triage, save reply | Owner |
| `POST` | `/api/v1/chat/message` | Unified quick chat (auto-creates or appends) | User / Guest |
| `DELETE` | `/api/v1/chat/conversations/:id` | Delete conversation session from MongoDB | Owner / Admin |

---

## 🛡️ Clinical Safety & Privacy Controls

1. **Emergency Interception:** Any mentions of acute medical emergencies (chest pain, breathlessness, stroke, trauma) trigger immediate alert advisories displaying Indian national emergency helplines (`112` and `108`).
2. **Access Isolation:** Conversation documents enforce strict `ownerUserId` validation. Users are strictly blocked (HTTP 403) from viewing, modifying, or deleting another patient's consultation history.
3. **Resilience Architecture:** If MongoDB is offline, MongoDB-dependent endpoints return HTTP 503 (`service_unavailable`), while MySQL-backed appointment booking, payments, and doctor portals remain 100% operational.
