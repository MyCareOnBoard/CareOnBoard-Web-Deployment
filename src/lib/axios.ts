import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { getIdToken } from '@/utils/auth';
import { auth } from '@/lib/firebase';
import { Routes } from "@/routes/constants";
import { handleMfaApiError } from '@/utils/auth/helpers/handleMfaApiError';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const axiosClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

export const axiosClientWithoutAuth: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

/**
 * Wait for Firebase auth to initialize
 * This prevents race conditions on page refresh
 */
let authInitPromise: Promise<void> | null = null;

const waitForAuthInit = (): Promise<void> => {
  if (authInitPromise) return authInitPromise;
  authInitPromise = new Promise((resolve) => {
    if (auth.currentUser !== null) {
      resolve();
      return;
    }
    const timeout = setTimeout(() => { unsubscribe(); resolve(); }, 5000);
    const unsubscribe = auth.onAuthStateChanged(() => {
      clearTimeout(timeout);
      unsubscribe();
      resolve();
    });
  });
  return authInitPromise;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

export const clearAuthCache = (): void => {
  cachedToken = null;
};

const getCachedIdToken = async (forceRefresh = false): Promise<string | null> => {
  if (!forceRefresh && cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }
  const token = await getIdToken();
  if (token) {
    cachedToken = { value: token, expiresAt: Date.now() + 55 * 60 * 1000 };
  }
  return token ?? null;
};

axiosClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Wait for Firebase auth to initialize before getting token
    await waitForAuthInit();

    // Get Firebase ID token
    const token = await getCachedIdToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const environment = import.meta.env.VITE_API_ENVIRONMENT || 'staging';
    config.headers['x-environment'] = environment;

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

axiosClientWithoutAuth.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const environment = import.meta.env.VITE_API_ENVIRONMENT || 'staging';
    config.headers['x-environment'] = environment;

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

const getAgencyId = (): string => {
  const searchParams = new URLSearchParams(window.location.search);
  const fromUrl = searchParams.get('agencyId');
  if (fromUrl) {
    localStorage.setItem('agencyId', fromUrl);
    return fromUrl;
  }

  if (window.location.hash.includes('?')) {
    const hashSearch = window.location.hash.split('?')[1];
    const hashParams = new URLSearchParams(hashSearch);
    const fromHash = hashParams.get('agencyId');
    if (fromHash) {
      localStorage.setItem('agencyId', fromHash);
      return fromHash;
    }
  }

  const cached = localStorage.getItem('agencyId');
  if (cached) return cached;

  return '';
};

axiosClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    if (error.response) {
      switch (error.response.status) {
        case 401: {
          try {
            cachedToken = null;
            const newToken = await getCachedIdToken(true);
            if (newToken && error.config) {
              error.config.headers = error.config.headers ?? {};
              error.config.headers.Authorization = `Bearer ${newToken}`;
              return axiosClient(error.config);
            }
          } catch {
            // fall through to redirect
          }
          const agencyId = getAgencyId();
          if (window.location.pathname !== Routes.auth.login) {
            window.location.href = Routes.auth.login + `?agencyId=${agencyId}`;
          }
          break;
        }
        case 403: {
          const data = error.response.data as { code?: string; error?: string }
          if (handleMfaApiError(403, data)) {
            return Promise.reject(error)
          }
          console.error('Access forbidden:', error.response.data);
          break;
        }
        case 404:
          console.error('Resource not found:', error.response.data);
          break;
        case 500:
          console.error('Server error:', error.response.data);
          break;
        default:
          console.error('API error:', error.response.data);
      }
    } else if (error.request) {
      console.error('Network error:', error.request);
    } else {
      console.error('Error:', error.message);
    }

    return Promise.reject(error);
  }
);

/**
 * @deprecated Use getIdToken from '@/utils/auth' instead
 * Firebase handles token management automatically
 */
export const setAuthToken = (token: string): void => {
  console.warn('setAuthToken is deprecated. Firebase manages tokens automatically.');
};

/**
 * @deprecated Firebase handles token management automatically
 */
export const removeAuthToken = (): void => {
  console.warn('removeAuthToken is deprecated. Use logout from auth context instead.');
};

/**
 * @deprecated Use getIdToken from '@/utils/auth' instead
 */
export const getAuthToken = (): Promise<string | null> => {
  console.warn('getAuthToken is deprecated. Use getIdToken from @/utils/auth instead.');
  return getIdToken();
};

export const setEnvironment = (env: string): void => {
  axiosClient.defaults.headers.common['x-environment'] = env;
};

export default axiosClient;

