const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

let pool = null;

const getSupabasePool = () => {
  if (!connectionString) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
  }

  return pool;
};

const checkSupabaseConnection = async () => {
  const currentPool = getSupabasePool();

  if (!currentPool) {
    return {
      connected: false,
      message: 'DATABASE_URL is not configured',
    };
  }

  const startedAt = Date.now();

  try {
    const result = await currentPool.query('SELECT NOW() AS server_time');
    return {
      connected: true,
      latencyMs: Date.now() - startedAt,
      serverTime: result.rows[0]?.server_time || null,
    };
  } catch (error) {
    return {
      connected: false,
      latencyMs: Date.now() - startedAt,
      message: error.message || 'Failed to reach Supabase Postgres',
    };
  }
};

module.exports = {
  getSupabasePool,
  checkSupabaseConnection,
};