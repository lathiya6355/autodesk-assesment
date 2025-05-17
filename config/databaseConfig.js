const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  port: Number(process.env.DB_PORT) || 5432,
  host: process.env.DB_HOST,
  password: `${process.env.DB_PASSWORD}`,
  database: process.env.DB_DATABASE
});

module.exports = pool;
