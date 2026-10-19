import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import doctorsRoutes from './routes/doctorsRoutes.js';
import appointmentsRoutes from './routes/appointmentsRoutes.js';
import slotsRoutes from './routes/slotsRoutes.js';
import paymentsRoutes from './routes/paymentsRoutes.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import reportsRoutes from './routes/reportsRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import { connectMongoDB, disconnectMongoDB } from './config/mongodb.js';
import { checkDbConnection } from './config/db.js';
import { initDatabase } from './database/initDB.js';

dotenv.config();
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 5000;

// Helper to sanitize URLs for CORS
const normalizeUrl = (u) => (u ? u.trim().replace(/\/+$/, '') : '');

const configuredOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  normalizeUrl(process.env.APP_URL),
  normalizeUrl(process.env.FRONTEND_URL),
].filter(Boolean);

// CORS — resilient configuration that allows localhost, custom domains, and all *.railway.app / *.vercel.app instances
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, Postman)
    if (!origin) return callback(null, true);
    
    const cleanOrigin = normalizeUrl(origin);
    const isAllowed =
      configuredOrigins.includes(cleanOrigin) ||
      cleanOrigin.endsWith('.up.railway.app') ||
      cleanOrigin.endsWith('.railway.app') ||
      cleanOrigin.endsWith('.vercel.app') ||
      cleanOrigin.includes('localhost') ||
      cleanOrigin.includes('127.0.0.1');

    if (isAllowed) {
      return callback(null, true);
    }
    console.warn(`[CORS Blocked] Origin not allowed: ${origin}`);
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check with Database and Razorpay Diagnostics
app.get('/api/v1/health', async (req, res) => {
  const dbStatus = await checkDbConnection();
  const rawKeyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || '';
  const rawSecret = process.env.RAZORPAY_KEY_SECRET || '';
  const hasRazorpay = Boolean(rawKeyId && rawSecret && !rawKeyId.includes('xxx') && !rawSecret.includes('xxx'));

  res.json({
    status: 'online',
    service: 'MediNest API Backend',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    database: {
      connected: dbStatus.connected,
      name: dbStatus.database || null,
      error: dbStatus.error || null,
    },
    razorpay: {
      configured: hasRazorpay,
      keyIdPrefix: rawKeyId ? `${rawKeyId.slice(0, 8)}...` : 'missing',
      isPlaceholder: rawKeyId.includes('xxx') || rawSecret.includes('xxx'),
    },
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/doctors', doctorsRoutes);
app.use('/api/v1/appointments', appointmentsRoutes);
app.use('/api/v1/slots', slotsRoutes);
app.use('/api/v1/payments', paymentsRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/chat', chatRoutes);

// Auto-initialize MySQL schema & doctors asynchronously
initDatabase().catch((err) => {
  console.warn('[DB Auto-Init Boot Warning]:', err.message);
});

// Connect to MongoDB asynchronously (non-blocking for Express & MySQL startup)
connectMongoDB().catch((err) => {
  console.warn('[MongoDB Startup Warning] Could not connect to MongoDB at boot:', err.message);
});

// Graceful shutdown
const handleGracefulShutdown = async (signal) => {
  console.log(`[MediNest Backend] Received ${signal}. Closing MongoDB connection...`);
  await disconnectMongoDB();
  process.exit(0);
};

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[MediNest Express Global Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[MediNest Express Backend] Server running on port ${PORT}`);
});

export default app;
