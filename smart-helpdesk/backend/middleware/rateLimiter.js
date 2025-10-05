// backend/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

function safeIp(req) {
  // prefer x-forwarded-for when behind proxy, otherwise use socket remoteAddress
  const forwarded = (req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip']));
  if (forwarded) return String(forwarded).split(',')[0].trim();
  if (req.socket && req.socket.remoteAddress) return String(req.socket.remoteAddress);
  if (req.connection && req.connection.remoteAddress) return String(req.connection.remoteAddress);
  return 'unknown';
}

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  // prefer user id when available, otherwise use an IP-derived string
  keyGenerator: (req, res) => {
    if (req.user && req.user.id) return String(req.user.id);
    return safeIp(req);
  },
  handler: (req, res) => {
    res.status(429).json({ error: { code: 'RATE_LIMIT', message: 'Too many requests' }});
  }
});
module.exports = limiter;
