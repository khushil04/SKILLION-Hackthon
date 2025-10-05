// backend/middleware/idempotency.js
const db = require('../db');

async function idempotencyHandler(req, res, next) {
  const key = req.header('Idempotency-Key');
  if (!key) return next();
  // check
  const q = await db.query('SELECT response FROM idempotency_keys WHERE key=$1', [key]);
  if (q.rows.length) {
    return res.json(q.rows[0].response);
  }
  // capture response
  const originalJson = res.json.bind(res);
  res.json = async (body) => {
    // store
    await db.query(
      `INSERT INTO idempotency_keys(key, user_id, method, route, request_hash, response) VALUES($1,$2,$3,$4,$5,$6)`,
      [key, req.user ? req.user.id : null, req.method, req.originalUrl, JSON.stringify(req.body || {}), body]
    );
    originalJson(body);
  };
  next();
}

module.exports = idempotencyHandler;
