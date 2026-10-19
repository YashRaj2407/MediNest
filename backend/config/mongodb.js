import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' });

let isConnecting = false;
let connectionPromise = null;
let lastFailureTime = 0;
const FAILURE_COOLDOWN_MS = 30000;

/**
 * Sanitizes MongoDB URI for logging (removes credentials if present)
 */
function sanitizeMongoUri(uri) {
  if (!uri) return '';
  return uri.replace(/\/\/(.*?)@/, '//***:***@');
}

/**
 * Connects to MongoDB using Mongoose.
 * Reuses existing connection if already established or in progress.
 * If connection fails, throws error or rejects promise without crashing the entire app.
 */
export async function connectMongoDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (isConnecting && connectionPromise) {
    return connectionPromise;
  }

  if (Date.now() - lastFailureTime < FAILURE_COOLDOWN_MS) {
    throw new Error('MongoDB connection in cooldown after recent failure');
  }

  const rawUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medinest';
  
  // Ensure default database is medinest if not specified in URI
  let effectiveUri = rawUri;
  if (!rawUri.includes('?') && !rawUri.slice(rawUri.lastIndexOf('/')).replace('/', '')) {
    effectiveUri = `${rawUri.replace(/\/$/, '')}/medinest`;
  }

  isConnecting = true;

  const options = {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 1,
  };

  connectionPromise = (async () => {
    try {
      const conn = await mongoose.connect(effectiveUri, options);
      const host = conn.connection.host || '127.0.0.1';
      const port = conn.connection.port || 27017;
      const dbName = conn.connection.name || 'medinest';

      console.log(`[MongoDB] Successfully connected to database: ${dbName} (${host}:${port})`);
      lastFailureTime = 0;
      return conn.connection;
    } catch (err) {
      lastFailureTime = Date.now();
      connectionPromise = null;
      console.error(`[MongoDB] Connection failed (${sanitizeMongoUri(effectiveUri)}): ${err.message}`);
      throw err;
    } finally {
      isConnecting = false;
    }
  })();

  return connectionPromise;
}

/**
 * Returns true if MongoDB is currently in readyState 1 (connected).
 */
export function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

/**
 * Disconnects from MongoDB gracefully (for tests and shutdown).
 */
export async function disconnectMongoDB() {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
      console.log('[MongoDB] Connection closed successfully.');
    } catch (err) {
      console.error('[MongoDB] Error during disconnect:', err.message);
    }
  }
}

// Event listeners for connection lifecycle
mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Disconnected from server.');
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Connection error event:', err.message);
});

export default {
  connectMongoDB,
  isMongoConnected,
  disconnectMongoDB,
};
