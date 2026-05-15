const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const initDb = async (opts = {}) => {
  if (process.env.DATABASE_URL) {
    console.log('Supabase/Postgres detected; skipping local MySQL schema init');
    return;
  }

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
    // Split schema into tables and indexes
    const indexStatements = schema.match(/CREATE INDEX .+;/g) || [];
    const tableStatements = schema.replace(/CREATE INDEX .+;/g, '').trim();

    // Create tables first
    if (tableStatements) {
      await connection.query(tableStatements);
      console.log('Database tables ensured');
    }

    // Create indexes (ignore errors if they already exist)
    for (const indexStatement of indexStatements) {
      try {
        await connection.query(indexStatement);
      } catch (indexErr) {
        // Silently ignore duplicate index errors
        if (indexErr.code !== 'ER_DUP_KEYNAME') {
          throw indexErr;
        }
        console.warn('Index already exists, skipping:', indexStatement.substring(0, 50) + '...');
      }
    }

    console.log('Database schema ensured');
  } catch (err) {
    console.error('Failed to initialize database schema', err.message || err);
    throw err;
  } finally {
    await connection.end();
  }
};

module.exports = initDb;
