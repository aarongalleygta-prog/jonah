const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// All statistics endpoints are admin/responder-only.
router.use(requireAuth, requireRole('admin', 'responder'));

// GET /api/stats/summary -> quick counters for the dashboard header
router.get('/summary', async (req, res) => {
  try {
    const [[total]] = await pool.query('SELECT COUNT(*) AS count FROM emergencies');
    const [[resolved]] = await pool.query("SELECT COUNT(*) AS count FROM emergencies WHERE status = 'resolved'");
    const [[unresolved]] = await pool.query("SELECT COUNT(*) AS count FROM emergencies WHERE status != 'resolved'");
    const [[critical]] = await pool.query("SELECT COUNT(*) AS count FROM emergencies WHERE priority = 'critical' AND status != 'resolved'");

    res.json({
      total: total.count,
      resolved: resolved.count,
      unresolved: unresolved.count,
      criticalOpen: critical.count,
    });
  } catch (err) {
    console.error('Summary stats error:', err);
    res.status(500).json({ error: 'Something went wrong while loading summary stats.' });
  }
});

// GET /api/stats/by-type -> most common emergency types
router.get('/by-type', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT type, COUNT(*) AS count FROM emergencies GROUP BY type ORDER BY count DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('By-type stats error:', err);
    res.status(500).json({ error: 'Something went wrong while loading type statistics.' });
  }
});

// GET /api/stats/by-month -> emergencies per month (last 12 months)
router.get('/by-month', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS count
      FROM emergencies
      WHERE created_at >= date('now', '-12 months')
      GROUP BY month
      ORDER BY month ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error('By-month stats error:', err);
    res.status(500).json({ error: 'Something went wrong while loading monthly statistics.' });
  }
});

// GET /api/stats/response-time -> average minutes from report to resolution
router.get('/response-time', async (req, res) => {
  try {
    const [[row]] = await pool.query(`
      SELECT AVG((julianday(resolved_at) - julianday(created_at)) * 1440.0) AS avg_minutes
      FROM emergencies
      WHERE resolved_at IS NOT NULL
    `);
    res.json({ averageMinutes: row.avg_minutes ? Math.round(row.avg_minutes) : null });
  } catch (err) {
    console.error('Response-time stats error:', err);
    res.status(500).json({ error: 'Something went wrong while loading response time.' });
  }
});

// GET /api/stats/by-location -> emergencies grouped by address text
router.get('/by-location', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT COALESCE(address_text, 'Unspecified') AS location, COUNT(*) AS count
      FROM emergencies
      GROUP BY location
      ORDER BY count DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    console.error('By-location stats error:', err);
    res.status(500).json({ error: 'Something went wrong while loading location statistics.' });
  }
});

module.exports = router;
