import { getApiHost, isServerReachable, requestWithRetries } from './api';

export const registerUser = async (payload) => {
  console.log('[REGISTER] Service version: v2-json-or-fetch');

  const normalizedPayload = {
    fullName: payload.fullName?.trim(),
    username: payload.username?.trim(),
    email: payload.email?.trim(),
    password: payload.password,
    profileImage: payload.profileImage,
  };

  console.log('[REGISTER] Starting signup with payload:', {
    fullName: normalizedPayload.fullName,
    username: normalizedPayload.username,
    email: normalizedPayload.email,
    hasPassword: !!normalizedPayload.password,
    hasProfileImage: !!normalizedPayload.profileImage,
  });

  try {
    await isServerReachable();
    console.log('[REGISTER] Sending POST request to /auth/register');
    let data;

    if (!normalizedPayload.profileImage) {
      const response = await requestWithRetries({
        method: 'post',
        url: '/auth/register',
        data: {
          fullName: normalizedPayload.fullName,
          username: normalizedPayload.username,
          email: normalizedPayload.email,
          password: normalizedPayload.password,
        },
      });
      data = response.data;
    } else {
      // RN fetch handles multipart boundaries more reliably for file uploads.
      const formData = new FormData();
      formData.append('fullName', normalizedPayload.fullName);
      formData.append('username', normalizedPayload.username);
      formData.append('email', normalizedPayload.email);
      formData.append('password', normalizedPayload.password);
      formData.append('profileImage', {
        uri: normalizedPayload.profileImage,
        name: `profile-${Date.now()}.jpg`,
        type: 'image/jpeg',
      });

      const response = await fetch(`${getApiHost()}/api/auth/register`, {
        method: 'POST',
        body: formData,
      });

      const raw = await response.text();
      const parsed = raw ? JSON.parse(raw) : null;

      if (!response.ok) {
        const fetchError = new Error(parsed?.message || 'Registration failed');
        fetchError.response = {
          status: response.status,
          data: parsed,
        };
        throw fetchError;
      }

      data = parsed;
    }

    console.log('[REGISTER] Registration successful. Response:', data);
    return data;
  } catch (error) {
    console.error('[REGISTER] Registration failed!');
    console.error('[REGISTER] Error status:', error.response?.status);
    console.error('[REGISTER] Error data:', error.response?.data);
    console.error('[REGISTER] Error message:', error.message);
    console.error('[REGISTER] Full error object:', error);

    // Re-throw with additional context
    throw error;
  }
};

export const loginUser = async ({ email, password }) => {
  await isServerReachable();
  const { data } = await requestWithRetries({
    method: 'post',
    url: '/auth/login',
    data: { email, password },
  });
  return data;
};

export const loadProfile = async () => {
  const { data } = await requestWithRetries({
    method: 'get',
    url: '/auth/profile',
  });
  return data;
};

export const forgotPasswordRequest = async (email) => {
  const { data } = await requestWithRetries({
    method: 'post',
    url: '/auth/forgot-password',
    data: { email },
  });
  return data;
};

export const logoutUser = async () => {
  const { data } = await requestWithRetries({
    method: 'post',
    url: '/auth/logout',
  });
  return data;
};
