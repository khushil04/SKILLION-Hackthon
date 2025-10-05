// backend/routes/tickets.js
const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const { requireAuth, requireRole } = require('../middleware/auth');

// Create ticket (idempotent)
router.post('/', requireAuth, async (req, res) => {
  const { title, description, priority, sla_minutes } = req.body;
  try {
    const payload = {
      title,
      description,
      created_by: req.user.id,
      priority: priority || 'normal',
      sla_due_at: sla_minutes ? new Date(Date.now() + parseInt(sla_minutes) * 60000).toISOString() : null
    };
    const { data: ticket, error: insertErr } = await supabase.from('tickets').insert(payload).select().single();
    if (insertErr) throw insertErr;
    await supabase.from('ticket_activities').insert({ ticket_id: ticket.id, actor_id: req.user.id, action: 'created', metadata: { priority } });
    res.status(201).json({ ticket });
  } catch (err) {
    console.error('Create ticket error', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Unexpected error' }});
  }
});

// Get tickets with pagination & optional search
router.get('/', requireAuth, async (req, res) => {
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const offset = parseInt(req.query.offset) || 0;
  const qText = req.query.q || null;
  try {
    let query = supabase.from('tickets').select('*').order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (qText) {
      query = supabase.from('tickets').select('*').or(`title.ilike.%${qText}%,description.ilike.%${qText}%`).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    }
    const { data, error } = await query;
    if (error) throw error;
    const next_offset = (data.length === limit) ? offset + limit : null;
    res.json({ items: data, next_offset });
  } catch (err) {
    console.error('Fetch tickets error', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Unexpected error' }});
  }
});

// Get single ticket
router.get('/:id', requireAuth, async (req, res) => {
  const id = req.params.id;
  try {
    const { data: ticket, error: tErr } = await supabase.from('tickets').select('*').eq('id', id).single();
    if (tErr) {
      if (tErr.code === 'PGRST116') return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' }});
      throw tErr;
    }
    const { data: comments } = await supabase.from('comments').select('*').eq('ticket_id', id).order('created_at', { ascending: true });
    const { data: activities } = await supabase.from('ticket_activities').select('*').eq('ticket_id', id).order('created_at', { ascending: true });
    res.json({ ticket, comments, activities });
  } catch (err) {
    console.error('Get ticket error', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Unexpected error' }});
  }
});

// PATCH ticket with optimistic locking
router.patch('/:id', requireAuth, async (req, res) => {
  const { title, description, status, assigned_to, version } = req.body;
  if (version === undefined) return res.status(400).json({ error: { code: 'MISSING_VERSION', message: 'version is required for optimistic locking' }});
  const id = req.params.id;
  try {
    // optimistic locking using version field
    const { data: existing, error: getErr } = await supabase.from('tickets').select('version').eq('id', id).single();
    if (getErr) throw getErr;
    if (existing.version !== version) return res.status(409).json({ error: { code: 'CONFLICT', message: 'Ticket was updated by someone else' }});
    const updates = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to;
    updates.version = existing.version + 1;
    const { data: ticket, error: updErr } = await supabase.from('tickets').update(updates).eq('id', id).select().single();
    if (updErr) throw updErr;
    await supabase.from('ticket_activities').insert({ ticket_id: id, actor_id: req.user.id, action: 'updated', metadata: { fields_changed: Object.keys(req.body) } });
    res.json({ ticket });
  } catch (err) {
    console.error('Patch ticket error', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Unexpected error' }});
  }
});

// Post comment
router.post('/:id/comments', requireAuth, async (req, res) => {
  const id = req.params.id;
  const { content } = req.body;
  try {
    const { data: comment, error } = await supabase.from('comments').insert({ ticket_id: id, author_id: req.user.id, content }).select().single();
    if (error) throw error;
    await supabase.from('ticket_activities').insert({ ticket_id: id, actor_id: req.user.id, action: 'commented', metadata: {} });
    res.status(201).json({ comment });
  } catch (err) {
    console.error('Post comment error', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Unexpected error' }});
  }
});

module.exports = router;
