const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------
// Priority classification
// A simple, explainable rule-based classifier (not full AI,
// but a defensible "intelligent decision-making" component
// for the project write-up). Fire and medical emergencies
// default higher; keyword scanning in the description bumps
// priority further (e.g. "unconscious", "trapped", "children").
// ---------------------------------------------------------
function classifyPriority(type, description = '') {
  const text = description.toLowerCase();

  const highRiskKeywords = ['unconscious', 'not breathing', 'trapped', 'children', 'child', 'collapsed', 'bleeding heavily', 'gunshot', 'explosion'];
  const hasHighRiskKeyword = highRiskKeywords.some((k) => text.includes(k));

  const baseByType = {
    fire: 'critical',
    medical: 'high',
    accident: 'high',
    security: 'high',
    flood: 'medium',
    other: 'low',
  };

  let priority = baseByType[type] || 'medium';

  if (hasHighRiskKeyword) {
    // Escalate by one tier if a high-risk keyword is present
    const order = ['low', 'medium', 'high', 'critical'];
    const idx = order.indexOf(priority);
    priority = order[Math.min(idx + 1, order.length - 1)];
  }

  return priority;
}

// ---------------------------------------------------------
// POST /api/emergencies
// Citizen reports a new emergency.
// ---------------------------------------------------------
router.post('/', requireAuth, async (req, res) => {
  try {
    const { type, description, latitude, longitude, addressText } = req.body;
    const validTypes = ['medical', 'fire', 'security', 'accident', 'flood', 'other'];

    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ error: 'A valid emergency type is required.' });
    }
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Location (latitude and longitude) is required.' });
    }

    const priority = classifyPriority(type, description);

    const [result] = await pool.query(
      `INSERT INTO emergencies (reporter_id, type, description, latitude, longitude, address_text, priority, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'reported')`,
      [req.user.id, type, description || null, latitude, longitude, addressText || null, priority]
    );

    await pool.query(
      `INSERT INTO status_history (emergency_id, old_status, new_status, changed_by)
       VALUES (?, NULL, 'reported', ?)`,
      [result.insertId, req.user.id]
    );

    res.status(201).json({
      message: 'Emergency reported successfully. Help is being notified.',
      emergencyId: result.insertId,
      priority,
    });
  } catch (err) {
    console.error('Report emergency error:', err);
    res.status(500).json({ error: 'Something went wrong while reporting the emergency.' });
  }
});

// ---------------------------------------------------------
// GET /api/emergencies
// Admin/responder dashboard listing, with optional filters.
// Citizens instead get only their own reports (see /mine).
// ---------------------------------------------------------
router.get('/', requireAuth, requireRole('admin', 'responder'), async (req, res) => {
  try {
    const { status, type, priority } = req.query;
    let query = `
      SELECT e.*, u.full_name AS reporter_name, u.phone AS reporter_phone,
             r.full_name AS responder_name
      FROM emergencies e
      JOIN users u ON e.reporter_id = u.id
      LEFT JOIN users r ON e.assigned_to = r.id
      WHERE 1 = 1
    `;
    const params = [];

    if (status) { query += ' AND e.status = ?'; params.push(status); }
    if (type) { query += ' AND e.type = ?'; params.push(type); }
    if (priority) { query += ' AND e.priority = ?'; params.push(priority); }

    query += " ORDER BY CASE e.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, e.created_at DESC";

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('List emergencies error:', err);
    res.status(500).json({ error: 'Something went wrong while loading emergencies.' });
  }
});

// ---------------------------------------------------------
// GET /api/emergencies/mine
// A citizen's own reported emergencies, to track status.
// ---------------------------------------------------------
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.*, r.full_name AS responder_name
       FROM emergencies e
       LEFT JOIN users r ON e.assigned_to = r.id
       WHERE e.reporter_id = ?
       ORDER BY e.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('My emergencies error:', err);
    res.status(500).json({ error: 'Something went wrong while loading your reports.' });
  }
});

// ---------------------------------------------------------
// PATCH /api/emergencies/:id/status
// Responder/admin updates status: reported -> accepted ->
// responding -> resolved. Also records who is assigned and
// timestamps resolution for response-time analytics.
// ---------------------------------------------------------
router.patch('/:id/status', requireAuth, requireRole('admin', 'responder'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['reported', 'accepted', 'responding', 'resolved'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }

    const [rows] = await pool.query('SELECT * FROM emergencies WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Emergency not found.' });
    }
    const current = rows[0];

    const resolvedAt = status === 'resolved' ? new Date() : current.resolved_at;
    const assignedTo = status === 'accepted' && !current.assigned_to ? req.user.id : current.assigned_to;

    await pool.query(
      'UPDATE emergencies SET status = ?, assigned_to = ?, resolved_at = ? WHERE id = ?',
      [status, assignedTo, resolvedAt, id]
    );

    await pool.query(
      `INSERT INTO status_history (emergency_id, old_status, new_status, changed_by)
       VALUES (?, ?, ?, ?)`,
      [id, current.status, status, req.user.id]
    );

    res.json({ message: `Emergency status updated to "${status}".` });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Something went wrong while updating status.' });
  }
});

module.exports = router;
