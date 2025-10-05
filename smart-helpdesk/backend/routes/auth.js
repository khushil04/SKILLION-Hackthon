const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { createClient } = require('@supabase/supabase-js');

// Server-side Supabase client (uses service role key)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().allow('')
});

router.post('/register', async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) return res.status(400).json({ error: { code: 'INVALID', message: error.message }});
  const { email, password, name } = value;

  try {
    const hashed = await bcrypt.hash(password, 10);
    const { data, error: sbError } = await supabase
      .from('users')
      .insert([{ email, password_hash: hashed, name }])
      .select('id, email, role, name');

    if (sbError) {
      console.error('Supabase insert error', sbError);
      // detect duplicate email (unique violation)
      if (sbError.code === '23505' || (sbError.details && sbError.details.includes('duplicate'))) {
        return res.status(409).json({ error: { code: 'EMAIL_TAKEN', field: 'email', message: 'Email already registered' }});
      }
      return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Unexpected error' }});
    }

    const user = Array.isArray(data) ? data[0] : data;
    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ user, token });
  } catch (e) {
    console.error('Register exception', e);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Unexpected error' }});
  }
});

const loginSchema = Joi.object({ email: Joi.string().email().required(), password: Joi.string().required() });

router.post('/login', async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ error: { code: 'INVALID', message: error.message }});
  const { email, password } = value;

  try {
    const { data, error: sbError } = await supabase
      .from('users')
      .select('id, password_hash, role, email, name')
      .eq('email', email)
      .limit(1);

    if (sbError) {
      console.error('Supabase select error', sbError);
      return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Unexpected error' }});
    }

    if (!data || data.length === 0) return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Wrong email/password' }});
    const userRow = data[0];
    const ok = await bcrypt.compare(password, userRow.password_hash || '');
    if (!ok) return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Wrong email/password' }});

    const token = jwt.sign({ id: userRow.id, role: userRow.role, email: userRow.email }, process.env.JWT_SECRET, { expiresIn: '8h' });
    const safeUser = { id: userRow.id, role: userRow.role, email: userRow.email, name: userRow.name };
    res.json({ user: safeUser, token });
  } catch (e) {
    console.error('Login exception', e);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Unexpected error' }});
  }
});

module.exports = router;



// // backend/routes/auth.js
// const express = require('express');
// const router = express.Router();
// const db = require('../db');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const Joi = require('joi');

// const registerSchema = Joi.object({
//   email: Joi.string().email().required(),
//   password: Joi.string().min(6).required(),
//   name: Joi.string().allow('')
// });

// router.post('/register', async (req, res) => {
//   const { error, value } = registerSchema.validate(req.body);
//   if (error) return res.status(400).json({ error: { code: 'INVALID', message: error.message }});
//   const { email, password, name } = value;
//   const hashed = await bcrypt.hash(password, 10);
//   try {
//     const result = await db.query(
//       `INSERT INTO users(email, password_hash, name) VALUES($1,$2,$3) RETURNING id, email, role, name`,
//       [email, hashed, name]
//     );
//     const user = result.rows[0];
//     const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: '8h' });
//     res.json({ user, token });
//   } catch (e) {
//     if (e.code === '23505') return res.status(409).json({ error: { code: 'EMAIL_TAKEN', field: 'email', message: 'Email already registered' }});
//     console.error(e);
//     res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Unexpected error' }});
//   }
// });

// const loginSchema = Joi.object({ email: Joi.string().email().required(), password: Joi.string().required() });

// router.post('/login', async (req, res) => {
//   const { error, value } = loginSchema.validate(req.body);
//   if (error) return res.status(400).json({ error: { code: 'INVALID', message: error.message }});
//   const { email, password } = value;
//   const q = await db.query('SELECT id, password_hash, role, email, name FROM users WHERE email=$1', [email]);
//   if (!q.rows.length) return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Wrong email/password' }});
//   const user = q.rows[0];
//   const ok = await bcrypt.compare(password, user.password_hash);
//   if (!ok) return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Wrong email/password' }});
//   const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: '8h' });
//   delete user.password_hash;
//   res.json({ user, token });
// });

// module.exports = router;
