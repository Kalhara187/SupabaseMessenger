import api from './api';

export const registerUser = async (payload) => {
  const formData = new FormData();
  formData.append('fullName', payload.fullName);
  formData.append('username', payload.username);
  formData.append('email', payload.email);
  formData.append('password', payload.password);

  if (payload.profileImage) {
    formData.append('profileImage', {
      uri: payload.profileImage,
      name: `profile-${Date.now()}.jpg`,
      type: 'image/jpeg',
    });
  }

  const { data } = await api.post('/auth/register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data;
};

export const loginUser = async ({ email, password }) => {
  const { data } = await api.post('/auth/login', { email, password });
  return data;
};

export const loadProfile = async () => {
  const { data } = await api.get('/auth/profile');
  return data;
};

export const forgotPasswordRequest = async (email) => {
  const { data } = await api.post('/auth/forgot-password', { email });
  return data;
};

export const logoutUser = async () => {
  const { data } = await api.post('/auth/logout');
  return data;
};
