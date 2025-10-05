// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');
const { start } = require('./cron/sla');
const rateLimiter = require('./middleware/rateLimiter');
const idempotency = require('./middleware/idempotency');
const optionalAuth = require('./middleware/auth');

const app = express();
// Allow Authorization header from the frontend and enable credentials for cookies if needed
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(optionalAuth);

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Routes
app.use('/api', rateLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/tickets', idempotency, ticketRoutes);

// Friendly root route -> redirect to health
app.get('/', (req, res) => {
  return res.redirect('/api/health');
});

// Meta
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', message: 'Backend connected 🚀' })
);

app.get('/api/_meta', (req, res) =>
  res.json({ name: 'Smart HelpDesk', version: '0.1' })
);

app.get('/.well-known/hackathon.json', (req, res) =>
  res.json({ name: 'Smart HelpDesk', contact: 'you@example.com' })
);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  // Start SLA cron only when explicitly enabled to avoid cron tasks hitting the DB
  // while DATABASE_URL or DNS is being configured during development.
  if (process.env.ENABLE_CRON === 'true') {
    console.log('SLA cron enabled');
    start();
  } else {
    console.log('SLA cron disabled (set ENABLE_CRON=true to enable)');
  }
});
