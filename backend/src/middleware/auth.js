const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'edumatch-secret-key-12345';

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Guest user
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

// Enforces that the user belongs to a specific tenant (not platform admin unless acting as tenant)
const requireTenant = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'admin' && !req.user.organization_id) {
    return res.status(400).json({ error: 'Bad Request: Tenant context required' });
  }
  next();
};

module.exports = {
  authenticate,
  requireAuth,
  requireRole,
  requireTenant,
  JWT_SECRET
};
