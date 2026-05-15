require('dotenv').config();

const baseURL = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!baseURL || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  'apikey': key,
  'Authorization': 'Bearer ' + key,
  'Prefer': 'return=representation'
};

const tables = [
  {
    name: 'users',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        username VARCHAR(191) UNIQUE NOT NULL,
        email VARCHAR(191) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        profile_image TEXT,
        bio TEXT,
        is_online BOOLEAN DEFAULT false,
        last_seen TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
  },
  {
    name: 'chats',
    sql: `
      CREATE TABLE IF NOT EXISTS chats (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NULL,
        group_image TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
  },
  {
    name: 'chat_participants',
    sql: `
      CREATE TABLE IF NOT EXISTS chat_participants (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        chat_id VARCHAR(36) NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (chat_id, user_id)
      )
    `
  },
  {
    name: 'messages',
    sql: `
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        chat_id VARCHAR(36) NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        sender_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT,
        message_type VARCHAR(50) DEFAULT 'text',
        media_url TEXT,
        seen BOOLEAN DEFAULT false,
        reply_to VARCHAR(36) NULL REFERENCES messages(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
  }
];

const createIndexes = [
  'CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at)',
  'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)'
];

(async () => {
  try {
    for (const table of tables) {
      console.log(`Creating table: ${table.name}...`);
      const response = await fetch(`${baseURL}/rest/v1/`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/sql'
        },
        body: table.sql
      });

      const text = await response.text();
      if (response.ok) {
        console.log(`✓ Table ${table.name} created/verified`);
      } else {
        console.warn(`⚠ Table ${table.name} response:`, text.substring(0, 100));
      }
    }

    console.log('\nDatabase initialization complete!');
    console.log('You can now register a user in the mobile app.');
    process.exit(0);
  } catch (error) {
    console.error('Error creating tables:', error.message);
    process.exit(1);
  }
})();
