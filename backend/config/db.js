// SQLite database stored on disk (on Railway: on the attached volume).
// Exposes pool.query(sql, params) -> [rows] for SELECTs, or
// [{ insertId, affectedRows }] for INSERT/UPDATE/DELETE, so route code stays simple.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Railway sets RAILWAY_VOLUME_MOUNT_PATH automatically when a volume is attached.
const dataDir =
  process.env.DATA_DIR ||
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  path.join(__dirname, '..', 'data');

fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'emergency.db');

if (process.env.RAILWAY_ENVIRONMENT && !process.env.DATA_DIR && !process.env.RAILWAY_VOLUME_MOUNT_PATH) {
  console.warn('WARNING: no Railway volume is attached. The database will be wiped on every redeploy. Add a volume to this service.');
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
console.log(`Using SQLite database at ${dbPath}`);

function normalise(params) {
  return params.map((p) => (p instanceof Date ? p.toISOString() : p === undefined ? null : p));
}

const pool = {
  async query(sql, params = []) {
    const stmt = db.prepare(sql);
    const args = normalise(params);
    if (stmt.reader) {
      return [stmt.all(...args)];
    }
    const info = stmt.run(...args);
    return [{ insertId: Number(info.lastInsertRowid), affectedRows: info.changes }];
  },
  exec: (sql) => db.exec(sql),
};

module.exports = pool;
