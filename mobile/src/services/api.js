import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import {
  API_TIMEOUT_MS,
  getApiBaseUrl,
  getApiCandidates,
  getApiHealthUrl,
  getConfiguredApiBaseUrl,
  getExpoHostBaseUrl,
  normalizeBaseUrl,
  resolveInitialApiBaseUrl,
} from '../config/apiConfig';

let NetInfo = null;

try {
  NetInfo = require('@react-native-community/netinfo').default || require('@react-native-community/netinfo');
} catch (error) {
  NetInfo = null;
  console.warn('[API] NetInfo not installed. Falling back to expo-network only. Install with: expo install @react-native-community/netinfo');
}

const STORAGE_KEY = 'sql-realtime-messenger.api-base-url';
const MAX_RETRIES = 3;
const INITIAL_PROBE_TIMEOUT_MS = 2500;
const RETRY_BACKOFF_BASE_MS = 300;

const api = axios.create({
  baseURL: getApiBaseUrl(resolveInitialApiBaseUrl()),
  timeout: API_TIMEOUT_MS,
});

let authToken = null;
let resolvedApiBaseUrl = normalizeBaseUrl(resolveInitialApiBaseUrl());
let initPromise = null;
let connectivitySubscription = null;

const getCurrentApiBaseUrl = () => normalizeBaseUrl(resolvedApiBaseUrl || api.defaults.baseURL || resolveInitialApiBaseUrl());

const getRequestUrl = (config) => {
  const baseURL = config.baseURL || api.defaults.baseURL || getApiBaseUrl(getCurrentApiBaseUrl()) || '';
  const url = config.url || '';

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${baseURL.replace(/\/$/, '')}/${String(url).replace(/^\//, '')}`;
};

const getAxiosStatus = (error) => error.response?.status ?? error.request?.status ?? 0;

const getFriendlyNetworkMessage = (error) => {
  if (error?.code === 'ECONNABORTED') {
    return 'The request timed out. Check that the backend is running and reachable on the selected API URL.';
  }

  if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error' || !error?.response) {
    return 'No response was received from the backend. Check Wi-Fi, the API IP, and that the server is running.';
  }

  if (error?.code === 'ENOTFOUND' || error?.code === 'EAI_AGAIN') {
    return 'The API host could not be resolved. Check the configured IP or host name.';
  }

  if (error?.code === 'ECONNREFUSED') {
    return 'The backend refused the connection. Confirm the Express server is listening on 0.0.0.0 and port 5000.';
  }

  const status = error?.response?.status;
  if (status === 404) {
    return 'API endpoint not found on the backend (404). Check the route path.';
  }

  if (status >= 500) {
    return 'The backend returned a server error. Check the server logs and database state.';
  }

  return error?.response?.data?.message || error?.message || 'Request failed';
};

export const createNetworkError = (error, fallbackMessage) => {
  const status = getAxiosStatus(error);
  const userMessage = fallbackMessage || getFriendlyNetworkMessage(error);

  const wrapped = new Error(userMessage);
  wrapped.original = error;
  wrapped.status = status;
  wrapped.userMessage = userMessage;
  wrapped.code = error?.code;
  wrapped.requestUrl = error?.config ? getRequestUrl(error.config) : undefined;
  return wrapped;
};

export const getApiHost = () => getCurrentApiBaseUrl();

export const getApiHealthUrlForCurrentHost = () => getApiHealthUrl(getCurrentApiBaseUrl());

export const setApiToken = (token) => {
  authToken = token;
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

api.interceptors.request.use(
  (config) => {
    config.baseURL = config.baseURL || api.defaults.baseURL || getApiBaseUrl(getCurrentApiBaseUrl());
    config.headers = config.headers || {};

    if (authToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }

    const method = (config.method || 'get').toUpperCase();
    console.log('[API] Request', {
      method,
      url: getRequestUrl(config),
      timeoutMs: config.timeout ?? api.defaults.timeout,
    });

    if (config.data) {
      console.log('[API] Request body', config.data);
    }

    return config;
  },
  (error) => {
    console.error('[API] Request interceptor error:', error.message);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log('[API] Response', {
      method: (response.config.method || 'get').toUpperCase(),
      url: getRequestUrl(response.config),
      status: response.status,
    });

    if (response.data) {
      console.log('[API] Response data', response.data);
    }

    return response;
  },
  (error) => {
    const normalizedError = createNetworkError(error);

    console.error('[API] Request failed', {
      method: (error.config?.method || 'get').toUpperCase(),
      url: error.config ? getRequestUrl(error.config) : undefined,
      status: normalizedError.status,
      code: normalizedError.code,
      message: normalizedError.message,
      userMessage: normalizedError.userMessage,
    });

    return Promise.reject(normalizedError);
  }
);

const getStoredApiBaseUrl = async () => {
  try {
    return normalizeBaseUrl(await AsyncStorage.getItem(STORAGE_KEY));
  } catch (error) {
    console.warn('[API] Could not read stored API base URL:', error.message || error);
    return null;
  }
};

const setResolvedApiBaseUrl = async (baseUrl) => {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) {
    return null;
  }

  resolvedApiBaseUrl = normalized;
  api.defaults.baseURL = getApiBaseUrl(normalized);

  try {
    await AsyncStorage.setItem(STORAGE_KEY, normalized);
  } catch (error) {
    console.warn('[API] Could not persist API base URL:', error.message || error);
  }

  console.log('[API] Selected API URL:', api.defaults.baseURL);
  return normalized;
};

export const checkApiConnection = async (candidateBase = getCurrentApiBaseUrl(), options = {}) => {
  const baseUrl = normalizeBaseUrl(candidateBase) || getCurrentApiBaseUrl();
  const healthUrl = getApiHealthUrl(baseUrl);

  if (!healthUrl) {
    return {
      reachable: false,
      baseUrl,
      healthUrl: null,
      status: 0,
      latencyMs: 0,
      error: new Error('Invalid API base URL'),
    };
  }

  const startedAt = Date.now();

  try {
    const response = await axios.get(healthUrl, {
      timeout: options.timeoutMs ?? INITIAL_PROBE_TIMEOUT_MS,
      headers: { Accept: 'application/json' },
    });
    const latencyMs = Date.now() - startedAt;
    const reachable = response.status >= 200 && response.status < 300;

    console.log('[API] Connection test result', {
      baseUrl,
      healthUrl,
      reachable,
      status: response.status,
      latencyMs,
    });

    return {
      reachable,
      baseUrl,
      healthUrl,
      status: response.status,
      latencyMs,
      response: response.data,
    };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const status = error.response?.status ?? error.request?.status ?? 0;

    console.warn('[API] Connection test failed', {
      baseUrl,
      healthUrl,
      status,
      code: error.code,
      latencyMs,
      message: error.message,
    });

    return {
      reachable: false,
      baseUrl,
      healthUrl,
      status,
      latencyMs,
      error,
    };
  }
};

export const resolveWorkingApiBaseUrl = async (candidates = []) => {
  const storedBaseUrl = await getStoredApiBaseUrl();
  const defaultCandidates = [
    getConfiguredApiBaseUrl(),
    getExpoHostBaseUrl(),
    storedBaseUrl,
    ...getApiCandidates(),
  ];

  const allCandidates = [...new Set([...candidates, ...defaultCandidates].map(normalizeBaseUrl).filter(Boolean))];
  console.log('[API] Resolving API base URL', { candidates: allCandidates });

  const networkState = await Network.getNetworkStateAsync().catch(() => null);
  if (networkState && networkState.isConnected === false) {
    const fallback = allCandidates[0] || resolveInitialApiBaseUrl();
    if (fallback) {
      await setResolvedApiBaseUrl(fallback);
    }

    return {
      reachable: false,
      offline: true,
      baseUrl: fallback,
      candidates: allCandidates,
    };
  }

  for (const candidate of allCandidates) {
    const result = await checkApiConnection(candidate);
    if (result.reachable) {
      await setResolvedApiBaseUrl(candidate);
      return {
        ...result,
        baseUrl: candidate,
      };
    }
  }

  const fallback = allCandidates[0] || resolveInitialApiBaseUrl();
  if (fallback) {
    await setResolvedApiBaseUrl(fallback);
  }

  return {
    reachable: false,
    baseUrl: fallback,
    candidates: allCandidates,
    status: 0,
  };
};

const shouldRetry = (error, attempt) => {
  if (attempt >= MAX_RETRIES) return false;
  if (!error) return false;

  const status = error.status ?? error.original?.response?.status;
  if (!error.original?.response) return true;
  if (status >= 500) return true;

  return false;
};

export const requestWithRetries = async (config) => {
  let attempt = 0;
  let lastError = null;

  while (attempt <= MAX_RETRIES) {
    try {
      const networkState = await Network.getNetworkStateAsync().catch(() => null);
      if (networkState && networkState.isConnected === false) {
        throw createNetworkError(new Error('Device offline'), 'Device is offline. Check Wi-Fi or mobile data.');
      }

      const merged = { timeout: API_TIMEOUT_MS, ...config };
      return await api.request(merged);
    } catch (error) {
      lastError = error.userMessage ? error : createNetworkError(error);
      attempt += 1;

      if (!shouldRetry(lastError, attempt)) {
        break;
      }

      const backoff = RETRY_BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
      console.log('[API] Retry attempt', {
        attempt,
        maxRetries: MAX_RETRIES,
        delayMs: backoff,
        url: error.config ? getRequestUrl(error.config) : undefined,
      });
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  throw lastError;
};

export const isServerReachable = async () => {
  try {
    const state = await Network.getNetworkStateAsync();
    if (!state.isConnected) {
      throw createNetworkError(new Error('No network connection'), 'Device is offline. Check Wi-Fi or mobile data.');
    }

    const result = await checkApiConnection(getCurrentApiBaseUrl(), { timeoutMs: INITIAL_PROBE_TIMEOUT_MS });
    if (result.reachable) {
      return true;
    }

    throw createNetworkError(result.error || new Error('Backend unreachable'), 'The backend server is not reachable right now.');
  } catch (error) {
    throw createNetworkError(error, 'The backend server is not reachable right now.');
  }
};

export const initApi = async () => {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    console.log('[API] Initializing API...');
    console.log('[API] Configured API URL:', getConfiguredApiBaseUrl() || 'not set');
    console.log('[API] Expo host API URL:', getExpoHostBaseUrl() || 'not detected');
    console.log('[API] Current candidate URLs:', getApiCandidates());

    try {
      const net = await Network.getNetworkStateAsync();
      console.log('[API] Network state:', {
        isConnected: net.isConnected,
        isInternetReachable: net.isInternetReachable,
        type: net.type,
        ip: net.ipAddress,
      });
    } catch (error) {
      console.warn('[API] Could not read network state', error.message);
    }

    const result = await resolveWorkingApiBaseUrl();
    console.log('[API] Connection test result:', {
      reachable: result.reachable,
      offline: result.offline || false,
      baseUrl: result.baseUrl,
      status: result.status ?? 0,
    });

    if (NetInfo && !connectivitySubscription) {
      connectivitySubscription = NetInfo.addEventListener(async (state) => {
        console.log('[API] Connectivity changed', state);
        if (state.isConnected) {
          try {
            const refreshResult = await resolveWorkingApiBaseUrl();
            console.log('[API] Reconnected API URL:', {
              baseUrl: refreshResult.baseUrl,
              reachable: refreshResult.reachable,
            });
          } catch (error) {
            console.warn('[API] Reconnect resolution failed:', error.message || error.userMessage || error);
          }
        }
      });
    } else if (!NetInfo) {
      console.warn('[API] NetInfo not available; skipping connectivity listener.');
    }

    return result;
  })();

  try {
    return await initPromise;
  } catch (error) {
    console.error('[API] Error during initialization:', error.message || error);
    return null;
  } finally {
    initPromise = null;
  }
};

export default api;
