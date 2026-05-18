import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const API_PORT = 5000;
export const API_TIMEOUT_MS = 15000;
export const API_HEALTH_PATH = '/api/health';

const extraApiUrl = Constants?.expoConfig?.extra?.apiUrl || Constants?.manifest?.extra?.apiUrl || null;

export const normalizeBaseUrl = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const prefixed = trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('exp://')
    ? trimmed.replace(/^exp:\/\//i, 'http://')
    : `http://${trimmed}`;

  try {
    const parsed = new URL(prefixed);
    if (!parsed.hostname) {
      return null;
    }

    const port = parsed.port ? `:${parsed.port}` : '';
    return `${parsed.protocol}//${parsed.hostname}${port}`.replace(/\/$/, '');
  } catch (error) {
    return null;
  }
};

export const getConfiguredApiBaseUrl = () => normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL) || normalizeBaseUrl(extraApiUrl);

export const getExpoHostBaseUrl = () => {
  const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest?.hostUri || Constants?.manifest?.debuggerHost || Constants?.expoConfig?.debuggerHost;

  if (!hostUri || typeof hostUri !== 'string') {
    return null;
  }

  const trimmed = hostUri.trim();
  if (!trimmed) {
    return null;
  }

  const prefixed = trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('exp://')
    ? trimmed.replace(/^exp:\/\//i, 'http://')
    : `http://${trimmed}`;

  try {
    const parsed = new URL(prefixed);
    if (!parsed.hostname) {
      return null;
    }

    return `${parsed.protocol}//${parsed.hostname}:${API_PORT}`;
  } catch (error) {
    const hostOnly = trimmed.split('/')[0];
    const hostname = hostOnly.split(':')[0];
    if (!hostname) {
      return null;
    }

    return `http://${hostname}:${API_PORT}`;
  }
};

export const getPlatformFallbackApiBases = () => {
  return Platform.OS === 'android'
    ? ['http://10.0.2.2:5000', 'http://localhost:5000', 'http://127.0.0.1:5000']
    : ['http://localhost:5000', 'http://127.0.0.1:5000'];
};

export const getApiCandidates = () => {
  const candidates = [getConfiguredApiBaseUrl(), getExpoHostBaseUrl(), ...getPlatformFallbackApiBases()];
  return [...new Set(candidates.map(normalizeBaseUrl).filter(Boolean))];
};

export const getApiBaseUrl = (baseUrl) => {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) {
    return null;
  }

  return `${normalized}/api`;
};

export const getApiHealthUrl = (baseUrl) => {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) {
    return null;
  }

  return `${normalized}${API_HEALTH_PATH}`;
};

export const resolveInitialApiBaseUrl = () => {
  return getApiCandidates()[0] || (Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000');
};
