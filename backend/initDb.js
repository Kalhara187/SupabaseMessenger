const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const initDb = async (opts = {}) => {
  const host = process.env.DB_HOST || opts.host || 'localhost';
  const port = Number(process.env.DB_PORT || opts.port || 3306);
  const user = process.env.DB_USER || opts.user || 'root';
  const password = process.env.DB_PASSWORD || opts.password || '';
  const schemaPath = path.resolve(__dirname, 'schema.sql');

  if (!fs.existsSync(schemaPath)) {
    console.warn('No schema.sql found, skipping DB init');
    return;
  }

  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Connect without specifying database to create it if missing
  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
  });

  try {
    await connection.query(schema);
    console.log('Database schema ensured');
  } catch (err) {
    console.error('Failed to initialize database schema', err.message || err);
    throw err;
  } finally {
    await connection.end();
  }
};

module.exports = initDb;
