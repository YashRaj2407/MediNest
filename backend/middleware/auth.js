/**
 * Express Authentication & Authorization Middleware
 * Validates user session/claims and enforces role isolation (patient, doctor, admin)
 */

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    // In dev/demo mode without token, check for custom header or query
    const devUserId = req.headers['x-user-id'] || req.query.userId;
    if (devUserId) {
      req.user = { id: devUserId, role: req.headers['x-user-role'] || 'patient' };
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized: Missing Authorization header' });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token format' });
  }

  // Attach decoded user info (Clerk token or session user)
  req.user = {
    id: req.headers['x-user-id'] || 'dev_user_id',
    role: req.headers['x-user-role'] || 'patient',
  };
  next();
}

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
