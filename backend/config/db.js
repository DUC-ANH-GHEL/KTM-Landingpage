// config/db.js - Kết nối PostgreSQL (Neon)

require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('⚠️ DATABASE_URL not set - Album API will not work');
}

const pool = connectionString ? new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Neon
  }
}) : null;

module.exports = {
  query: (text, params) => {
    if (!pool) throw new Error('Database not configured');
    return pool.query(text, params);
  },
  pool
};
