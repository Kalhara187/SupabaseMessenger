import axios from 'axios';
import * as Network from 'expo-network';

let API_HOST = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000';

const api = axios.create({
  baseURL: `${API_HOST}/api`,
  timeout: 15000,
});

let authToken = null;

export const setApiToken = (token) => {
  authToken = token;
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

api.interceptors.request.use((config) => {
  if (authToken && !config.headers?.Authorization) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

export const getApiHost = () => API_HOST;

export const initApi = async () => {
  try {
    // If user provided EXPO_PUBLIC_API_URL, prefer it
    if (process.env.EXPO_PUBLIC_API_URL && process.env.EXPO_PUBLIC_API_URL !== '') {
      API_HOST = process.env.EXPO_PUBLIC_API_URL;
    } else {
      const info = await Network.getIpAddressAsync();
      if (info) {
        API_HOST = `http://${info}:5000`;
      }
    }
  } catch (err) {
    // fallback remains
  }

  api.defaults.baseURL = `${API_HOST}/api`;
  return API_HOST;
};

export default api;
