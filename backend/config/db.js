// Database connection pool
// Works locally (DB_* variables) and on Railway, which injects MYSQL_URL
// (and MYSQLHOST / MYSQLPORT / MYSQLUSER / MYSQLPASSWORD / MYSQLDATABASE)
// when you add a MySQL service to the project.
require('dotenv').config();
const mysql = require('mysql2/promise');

const common = {
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Return DATETIME/TIMESTAMP in a consistent way regardless of server timezone
  timezone: 'Z',
};

let pool;
const url = process.env.MYSQL_URL || process.env.DATABASE_URL;

if (url) {
  pool = mysql.createPool({ uri: url, ...common });
} else {
  pool = mysql.createPool({
    host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
    port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
    user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'emergency_response',
    ...common,
  });
}

module.exports = pool;
