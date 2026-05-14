const pool = require('../config/db');

const createUser = async ({ fullName, username, email, password, profileImage = null }) => {
  const [result] = await pool.execute(
    `INSERT INTO users (full_name, username, email, password, profile_image) VALUES (?, ?, ?, ?, ?)`,
    [fullName, username, email, password, profileImage]
  );

  return result.insertId;
};

const findUserByEmail = async (email) => {
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  return rows[0] || null;
};

const findUserById = async (id) => {
  const [rows] = await pool.execute(
    'SELECT id, full_name, username, email, profile_image, bio, is_online, last_seen, created_at FROM users WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
};

const updateOnlineStatus = async (userId, isOnline) => {
  await pool.execute(
    'UPDATE users SET is_online = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?',
    [isOnline ? 1 : 0, userId]
  );
};

const updateProfile = async (id, payload) => {
  const { full_name, username, bio, profile_image } = payload;
  await pool.execute(
    'UPDATE users SET full_name = ?, username = ?, bio = ?, profile_image = ? WHERE id = ?',
    [full_name, username, bio, profile_image, id]
  );
  return findUserById(id);
};

const listUsers = async (query) => {
  if (query) {
    const like = `%${query}%`;
    const [rows] = await pool.execute(
      `SELECT id, full_name, username, profile_image, bio, is_online, last_seen
       FROM users
       WHERE full_name LIKE ? OR username LIKE ?
       ORDER BY full_name ASC
       LIMIT 50`,
      [like, like]
    );
    return rows;
  }

  const [rows] = await pool.execute(
    'SELECT id, full_name, username, profile_image, bio, is_online, last_seen FROM users ORDER BY full_name ASC LIMIT 100'
  );
  return rows;
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  updateOnlineStatus,
  updateProfile,
  listUsers,
};
