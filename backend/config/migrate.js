// Creates tables (if missing) and seeds the first admin account.
// Runs automatically on every server start, so a fresh Railway MySQL
// database is ready without running schema.sql by hand. Safe to re-run.
const bcrypt = require('bcryptjs');
const pool = require('./db');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    full_name          VARCHAR(100) NOT NULL,
    email              VARCHAR(150) NOT NULL UNIQUE,
    phone              VARCHAR(20)  NOT NULL,
    password_hash      VARCHAR(255) NOT NULL,
    emergency_contact  VARCHAR(20)  NULL,
    role               ENUM('citizen','responder','admin') NOT NULL DEFAULT 'citizen',
    responder_category ENUM('medical','fire','security','accident','flood','other') NULL,
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS emergencies (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    reporter_id  INT NOT NULL,
    type         ENUM('medical','fire','security','accident','flood','other') NOT NULL,
    description  TEXT NULL,
    latitude     DECIMAL(10, 7) NOT NULL,
    longitude    DECIMAL(10, 7) NOT NULL,
    address_text VARCHAR(255) NULL,
    priority     ENUM('critical','high','medium','low') NOT NULL DEFAULT 'medium',
    status       ENUM('reported','accepted','responding','resolved') NOT NULL DEFAULT 'reported',
    assigned_to  INT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at  TIMESTAMP NULL,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_emergencies_status (status),
    INDEX idx_emergencies_type (type),
    INDEX idx_emergencies_created (created_at)
  )`,
  `CREATE TABLE IF NOT EXISTS status_history (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    emergency_id INT NOT NULL,
    old_status   VARCHAR(20) NULL,
    new_status   VARCHAR(20) NOT NULL,
    changed_by   INT NULL,
    changed_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (emergency_id) REFERENCES emergencies(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
  )`,
];

async function migrate() {
  for (const sql of TABLES) {
    await pool.query(sql);
  }

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
}

// The database service may still be starting when the app boots, so retry.
async function migrateWithRetry(attempts = 10, delayMs = 3000) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await migrate();
      console.log('Database ready.');
      return;
    } catch (err) {
      console.error(`Database not ready (attempt ${i}/${attempts}): ${err.message}`);
      if (i === attempts) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

module.exports = migrateWithRetry;
