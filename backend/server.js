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

dotenv.config();
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'MediNest API Backend',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
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

app.listen(PORT, () => {
  console.log(`[MediNest Express Backend] Server running on http://localhost:${PORT}`);
});

export default app;
