/**
 * Express Authentication & Authorization Middleware
 * Uses Clerk (@clerk/express) for JWT verification.
 *
 * In production: verifies Bearer tokens via Clerk's JWKS endpoint.
 * In dev/demo mode (no CLERK_SECRET_KEY): falls back to x-user-id / x-user-role headers.
 */

import { clerkClient, verifyToken } from '@clerk/express';

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || '';
const CLERK_PUBLISHABLE_KEY = process.env.VITE_CLERK_PUBLISHABLE_KEY || '';

/**
 * Middleware that verifies the Bearer token using Clerk.
 * If Clerk is not configured (no CLERK_SECRET_KEY), falls back to dev headers.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  // ── Dev/demo fallback when Clerk is not configured ──────────────────────
  if (!CLERK_SECRET_KEY) {
    const devUserId = req.headers['x-user-id'] || req.query.userId;
    if (devUserId) {
      req.user = { id: devUserId, role: req.headers['x-user-role'] || 'patient' };
      return next();
    }
    // Allow unauthenticated requests in demo mode with a default user
    req.user = { id: 'demo_user', role: 'patient' };
    return next();
  }

  // ── Production: Verify Clerk JWT ────────────────────────────────────────
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header' });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Empty token' });
  }

  verifyToken(token, {
    secretKey: CLERK_SECRET_KEY,
  })
    .then((decoded) => {
      req.user = {
        id: decoded.sub,
        role: decoded.metadata?.role || decoded.public_metadata?.role || 'patient',
        email: decoded.email,
        sessionId: decoded.sid,
      };
      next();
    })
    .catch((err) => {
      console.error('[Auth] Clerk token verification failed:', err.message);
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    });
}

/**
 * Role-based authorization middleware.
 * Must be used after requireAuth.
 */
export function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: Requires role [${roles.join(', ')}]` });
    }
    next();
  };
}
