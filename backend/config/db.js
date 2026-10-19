// SQLite database stored on disk (on Railway: on the attached volume).
// Exposes pool.query(sql, params) -> [rows] for SELECTs, or
// [{ insertId, affectedRows }] for INSERT/UPDATE/DELETE, so route code stays simple.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
// Built into Node (22.13+), so there is nothing native to download or compile.
const { DatabaseSync } = require('node:sqlite');

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

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
console.log(`Using SQLite database at ${dbPath}`);

function normalise(params) {
  return params.map((p) => (p instanceof Date ? p.toISOString() : p === undefined ? null : p));
}

const pool = {
  async query(sql, params = []) {
    const stmt = db.prepare(sql);
    const args = normalise(params);
    if (/^\s*(select|with|pragma)\b/i.test(sql)) {
      return [stmt.all(...args)];
    }
    const info = stmt.run(...args);
    return [{ insertId: Number(info.lastInsertRowid), affectedRows: info.changes }];
  },
  exec: (sql) => db.exec(sql),
};

module.exports = pool;
