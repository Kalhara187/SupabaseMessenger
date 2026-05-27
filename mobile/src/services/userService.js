import api from './api';

export const fetchUsers = async (query = '') => {
  const { data } = await api.get('/users', {
    params: { q: query || '' },
  });
  return data;
};
