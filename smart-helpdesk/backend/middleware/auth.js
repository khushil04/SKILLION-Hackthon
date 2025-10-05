// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
module.exports = function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  // dev debug: log incoming authorization header (may be undefined if CORS blocks it)
  console.log('optionalAuth header:', auth);
  if (!auth) return next();
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
  } catch (e) {
    console.error('optionalAuth verify error:', e && e.toString ? e.toString() : e);
  }
  return next();
};

module.exports.requireAuth = function requireAuth(req, res, next) {
  // Skip CORS preflight requests
  if (req.method === 'OPTIONS') return next();

  const auth = req.headers.authorization;
  console.log('AUTH HEADER RECEIVED:', auth);
  if (!auth) return res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Missing token' }});
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    console.error('requireAuth verify error:', e && e.toString ? e.toString() : e);
    res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid token' }});
  }
};

module.exports.requireRole = function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Missing token' }});
    if (req.user.role !== role && req.user.role !== 'admin') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient role' }});
    }
    next();
  };
};
