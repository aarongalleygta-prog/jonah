// Creates tables (if missing) and seeds the first admin account.
// Runs on every server start. Safe to re-run.
const bcrypt = require('bcryptjs');
const pool = require('./db');

const NOW = "strftime('%Y-%m-%dT%H:%M:%SZ','now')";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name          TEXT NOT NULL,
  email              TEXT NOT NULL UNIQUE,
  phone              TEXT NOT NULL,
  password_hash      TEXT NOT NULL,
  emergency_contact  TEXT NULL,
  role               TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen','responder','admin')),
  responder_category TEXT NULL CHECK (responder_category IN ('medical','fire','security','accident','flood','other')),
  created_at         TEXT DEFAULT (${NOW})
);

CREATE TABLE IF NOT EXISTS emergencies (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id  INTEGER NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('medical','fire','security','accident','flood','other')),
  description  TEXT NULL,
  latitude     REAL NOT NULL,
  longitude    REAL NOT NULL,
  address_text TEXT NULL,
  priority     TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  status       TEXT NOT NULL DEFAULT 'reported' CHECK (status IN ('reported','accepted','responding','resolved')),
  assigned_to  INTEGER NULL,
  created_at   TEXT DEFAULT (${NOW}),
  resolved_at  TEXT NULL,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS status_history (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  emergency_id INTEGER NOT NULL,
  old_status   TEXT NULL,
  new_status   TEXT NOT NULL,
  changed_by   INTEGER NULL,
  changed_at   TEXT DEFAULT (${NOW}),
  FOREIGN KEY (emergency_id) REFERENCES emergencies(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_emergencies_status  ON emergencies(status);
CREATE INDEX IF NOT EXISTS idx_emergencies_type    ON emergencies(type);
CREATE INDEX IF NOT EXISTS idx_emergencies_created ON emergencies(created_at);
`;

async function migrate() {
  pool.exec(SCHEMA);

  // Seed the first admin only if no admin exists yet.
  const [admins] = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (admins.length === 0) {
    const email = process.env.ADMIN_EMAIL || 'admin@emergency.local';
    const password = process.env.ADMIN_PASSWORD || 'Admin@123';
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ('System Admin', ?, '0000000000', ?, 'admin')`,
      [email, hash]
    );
    console.log(`Seeded admin account: ${email}`);
    if (!process.env.ADMIN_PASSWORD) {
      console.warn('WARNING: using the default admin password. Set ADMIN_PASSWORD (before first deploy) or change it right away.');
    }
  }
  console.log('Database ready.');
}

module.exports = migrate;
