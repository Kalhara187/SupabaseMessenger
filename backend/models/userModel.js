const supabaseUrl = process.env.SUPABASE_API_URL || (process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/` : null);
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getSupabaseHeaders = () => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase is not configured');
  }

  return {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
  };
};

const supabaseRequest = async (path, options = {}) => {
  const fullUrl = `${supabaseUrl}${path}`;
  const method = options.method || 'GET';

  console.log(`[SUPABASE] ${method} ${path}`);

  try {
    const response = await fetch(fullUrl, {
      method,
      headers: {
        ...getSupabaseHeaders(),
        ...(options.headers || {}),
        ...(options.returnRepresentation ? { Prefer: 'return=representation' } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    console.log(`[SUPABASE] Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SUPABASE] ${method} ${path} failed with status ${response.status}`);
      console.error(`[SUPABASE] Error response:`, errorText);
      throw new Error(`Supabase request failed: ${response.status} - ${errorText || 'Unknown error'}`);
    }

    const text = await response.text();
    const result = text ? JSON.parse(text) : null;
    console.log(`[SUPABASE] Response data:`, result);
    return result;
  } catch (error) {
    console.error('[SUPABASE] Request error:', error.message || error);
    throw error;
  }
};

const createUser = async ({ fullName, username, email, password, profileImage = null }) => {
  const response = await supabaseRequest('users', {
    method: 'POST',
    returnRepresentation: true,
    body: {
      full_name: fullName,
      username,
      email,
      password,
      profile_image: profileImage,
    },
  });

  // Handle both array and object responses from Supabase
  if (Array.isArray(response) && response.length > 0) {
    return response[0].id;
  } else if (response && typeof response === 'object' && response.id) {
    return response.id;
  }

  console.warn('Unexpected response format from Supabase createUser:', response);
  return null;
};

const findUserByEmail = async (email) => {
  const rows = await supabaseRequest(`users?select=*&email=eq.${encodeURIComponent(email)}&limit=1`);
  return rows?.[0] || null;
};

const findUserById = async (id) => {
  const rows = await supabaseRequest(`users?select=id,full_name,username,email,profile_image,bio,is_online,last_seen,created_at&id=eq.${encodeURIComponent(id)}&limit=1`);
  return rows?.[0] || null;
};

const updateOnlineStatus = async (userId, isOnline) => {
  await supabaseRequest(`users?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: {
      is_online: Boolean(isOnline),
      last_seen: new Date().toISOString(),
    },
  });
};

const updateProfile = async (id, payload) => {
  const updatePayload = {};

  if (payload.full_name !== undefined) updatePayload.full_name = payload.full_name;
  if (payload.username !== undefined) updatePayload.username = payload.username;
  if (payload.bio !== undefined) updatePayload.bio = payload.bio;
  if (payload.profile_image !== undefined) updatePayload.profile_image = payload.profile_image;

  await supabaseRequest(`users?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: updatePayload,
  });

  return findUserById(id);
};

const listUsers = async (query) => {
  const rows = await supabaseRequest('users?select=id,full_name,username,profile_image,bio,is_online,last_seen,created_at&order=full_name.asc&limit=100');

  if (!query) {
    return rows || [];
  }

  const search = query.toLowerCase();
  return (rows || []).filter((item) => {
    const fullName = String(item.full_name || '').toLowerCase();
    const username = String(item.username || '').toLowerCase();
    return fullName.includes(search) || username.includes(search);
  }).slice(0, 50);
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  updateOnlineStatus,
  updateProfile,
  listUsers,
};
