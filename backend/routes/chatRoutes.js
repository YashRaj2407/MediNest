import express from 'express';
import pool from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import {
  getChatStatus,
  createConversation,
  getConversations,
  getConversationById,
  sendMessage,
  quickChat,
  deleteConversation,
} from '../controllers/chatController.js';

const router = express.Router();

/**
 * Optional authentication middleware for chat:
 * - If Bearer token or Admin Key is present: strictly verifies via requireAuth.
 * - If x-user-id header is present: checks MySQL profiles. If found and active, authenticates user.
 *   If not found in MySQL, assigns guest session under that identifier.
 * - Otherwise: proceeds as guest session.
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const adminKey = req.headers['x-admin-key'];
  const userId = req.headers['x-user-id'];

  if (authHeader || adminKey) {
    return requireAuth(req, res, next);
  }

  if (userId) {
    try {
      const [[p]] = await pool.query(
        `SELECT id, role, account_status, email FROM profiles WHERE id = ?`,
        [userId]
      );
      if (p) {
        if (p.account_status !== 'active') {
          return res.status(403).json({ error: 'Your account has been deactivated or deleted.' });
        }
        req.user = { id: p.id, role: p.role, email: p.email };
        return next();
      }
    } catch (_) {}

    // Not a MySQL registered profile; treat safely as guest session
    req.user = { id: userId, role: 'guest' };
    return next();
  }

  return next();
}

// 1. Service Health & Connectivity Check
router.get('/status', getChatStatus);

// 2. Unified Quick Chat (Auto-creates or appends)
router.post('/message', optionalAuth, quickChat);

// 3. Conversation Management
router.post('/conversations', optionalAuth, createConversation);
router.get('/conversations', optionalAuth, getConversations);
router.get('/conversations/:id', optionalAuth, getConversationById);
router.delete('/conversations/:id', optionalAuth, deleteConversation);

// 4. Message Posting
router.post('/conversations/:id/messages', optionalAuth, sendMessage);

export default router;
