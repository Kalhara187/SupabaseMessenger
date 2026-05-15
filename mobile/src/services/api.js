import axios from 'axios';
import * as Network from 'expo-network';
import { NativeModules, Platform } from 'react-native';

const normalizeHost = (rawHost) => {
  if (!rawHost || typeof rawHost !== 'string') {
    return null;
  }

  const trimmed = rawHost.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  return `http://${trimmed}`;
};

const getHostFromMetroScriptUrl = () => {
  const scriptURL = NativeModules?.SourceCode?.scriptURL;
  if (!scriptURL || typeof scriptURL !== 'string') {
    return null;
  }

  const match = scriptURL.match(/^https?:\/\/([^/:]+)(?::\d+)?\//i);
  if (!match?.[1]) {
    return null;
  }

  const host = match[1];

  // 10.0.2.2 is Android emulator loopback; if Metro already runs on LAN IP, use that.
  if (host === 'localhost' || host === '127.0.0.1') {
    return Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';
  }

  return `http://${host}:5000`;
};

const resolveApiHost = () => {
  const metroHost = normalizeHost(getHostFromMetroScriptUrl());
  if (metroHost) {
    return metroHost;
  }

  const envHost = normalizeHost(process.env.EXPO_PUBLIC_API_URL);
  if (envHost) {
    return envHost;
  }

  return Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';
};

let API_HOST = resolveApiHost();

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

// Request interceptor with logging
api.interceptors.request.use(
  (config) => {
    const resolvedHost = resolveApiHost();
    if (resolvedHost && resolvedHost !== API_HOST) {
      API_HOST = resolvedHost;
      api.defaults.baseURL = `${API_HOST}/api`;
    }

    if (!config.baseURL) {
      config.baseURL = `${API_HOST}/api`;
    }

    if (authToken && !config.headers?.Authorization) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    console.log(`[API] ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API] Request interceptor error:', error.message);
    return Promise.reject(error);
  }
);

// Response interceptor with error logging
api.interceptors.response.use(
  (response) => {
    console.log(`[API] Response ${response.status} from ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('[API] Response error interceptor triggered');

    if (error.response) {
      console.error('[API] Response received but with error status');
      console.error('  Status:', error.response.status);
      console.error('  Status Text:', error.response.statusText);
      console.error('  Data:', error.response.data);
      console.error('  Headers:', error.response.headers);
    } else if (error.request) {
      console.error('[API] Request made but no response received (network error)');
      console.error('  Request:', error.request);
      console.error('  Message:', error.message);

      // Check if it's a timeout
      if (error.code === 'ECONNABORTED') {
        console.error('[API] Request timeout - server took too long to respond');
      }
      // Check if it's a network connectivity issue
      if (error.message.includes('Network')) {
        console.error('[API] Network connectivity issue detected');
      }
    } else {
      console.error('[API] Error before request could be sent');
      console.error('  Message:', error.message);
    }

    console.error('[API] Full error object:', error);
    return Promise.reject(error);
  }
);

export const getApiHost = () => API_HOST;

export const initApi = async () => {
  try {
    console.log('[API] Initializing API...');

    API_HOST = resolveApiHost();
    console.log('[API] Resolved API host:', API_HOST);

    // Test network connectivity
    try {
      const netInfo = await Network.getNetworkStateAsync();
      console.log('[API] Network state:', {
        isConnected: netInfo.isConnected,
        isInternetReachable: netInfo.isInternetReachable,
        type: netInfo.type,
      });
    } catch (netErr) {
      console.warn('[API] Could not determine network state:', netErr.message);
    }
  } catch (err) {
    console.error('[API] Error during initialization:', err.message);
  }

  api.defaults.baseURL = `${API_HOST}/api`;
  console.log('[API] API base URL set to:', api.defaults.baseURL);
  return API_HOST;
};

export default api;
