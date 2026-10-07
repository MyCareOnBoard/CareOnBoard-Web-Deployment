import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { getIdToken } from '@/utils/auth/services/authService';
import { auth } from '@/lib/firebase';
import { Routes } from "@/routes/constants";
import { handleMfaApiError } from '@/utils/auth/helpers/handleMfaApiError';

/** A request config carrying the one-retry marker the 401 handler sets. */
type RetryableConfig = InternalAxiosRequestConfig & { _retriedAfter401?: boolean; _authUid?: string | null };

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Which backend database every request is routed to, via the `x-environment` header.
 *
 * The header decides which Firestore database the API reads: "staging" gets the named
 * staging database, anything else gets the default one. That makes it the single most
 * consequential variable in the app, and it used to be resolved inline in two places with
 * a silent fallback — so an environment that had never set it read staging without
 * announcing it. Two apps disagreeing that way is invisible from the outside: the account
 * exists, the token verifies, and the API answers "User not found" about a user who is
 * plainly there, in the other database.
 *
 * The default stays "staging" deliberately. Flipping it to production would fix the
 * silence by pointing any deployment that forgot the variable at live data, which is worse
 * than the problem — a forgotten variable should leave you broken, not writing to
 * production. What changes is that it is now said out loud, once, at startup.
 */
export const API_ENVIRONMENT: string = import.meta.env.VITE_API_ENVIRONMENT || 'staging';

const API_ENVIRONMENT_IS_DEFAULTED = !import.meta.env.VITE_API_ENVIRONMENT;

// Logged once rather than warned per request. Answering "which database am I talking to"
// should take one glance at the console, not a comparison of two apps' network tabs.
console.info(
  API_ENVIRONMENT_IS_DEFAULTED
    ? `[api] environment "${API_ENVIRONMENT}" (defaulted — VITE_API_ENVIRONMENT is not set)`
    : `[api] environment "${API_ENVIRONMENT}"`,
);

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

let cachedToken: { uid: string; value: string; expiresAt: number } | null = null;

export const clearAuthCache = (): void => {
  cachedToken = null;
};

const getCachedIdToken = async (forceRefresh = false): Promise<string | null> => {
  const uid = auth.currentUser?.uid ?? null;
  if (!forceRefresh && cachedToken && cachedToken.uid === uid && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }
  const token = await getIdToken(forceRefresh);
  if ((auth.currentUser?.uid ?? null) !== uid) {
    throw new axios.CanceledError('The signed-in account changed.');
  }
  if (token && uid) {
    cachedToken = { uid, value: token, expiresAt: Date.now() + 55 * 60 * 1000 };
  }
  return token ?? null;
};

axiosClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Wait for Firebase auth to initialize before getting token
    await waitForAuthInit();

    // Get Firebase ID token
    (config as RetryableConfig)._authUid = auth.currentUser?.uid ?? null;
    const token = await getCachedIdToken();
    if ((config as RetryableConfig)._authUid !== (auth.currentUser?.uid ?? null)) {
      throw new axios.CanceledError('The signed-in account changed.');
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    config.headers['x-environment'] = API_ENVIRONMENT;

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

axiosClientWithoutAuth.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    config.headers['x-environment'] = API_ENVIRONMENT;

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
          // One retry, and only one.
          //
          // A 401 that survives a freshly minted token is not a stale token: it is an
          // account the API will not accept — no `users` record in the database this build
          // points at, a revoked account, a wrong environment. Refreshing cannot fix any
          // of those, and the retry re-enters this same handler, so without a guard it
          // refreshes and retries forever. That loop hammers Firebase's token endpoint and
          // never reaches the redirect below, so the user sits on a spinner instead of
          // being told to sign in again.
          const retryable = error.config as RetryableConfig | undefined;
          if (retryable && retryable._authUid !== (auth.currentUser?.uid ?? null)) {
            return Promise.reject(error);
          }
          if (retryable && !retryable._retriedAfter401) {
            try {
              cachedToken = null;
              const newToken = await getCachedIdToken(true);
              if (retryable._authUid !== (auth.currentUser?.uid ?? null)) {
                return Promise.reject(error);
              }
              if (newToken) {
                retryable._retriedAfter401 = true;
                retryable.headers = retryable.headers ?? {};
                retryable.headers.Authorization = `Bearer ${newToken}`;
                return axiosClient(retryable);
              }
            } catch {
              if (retryable._authUid !== (auth.currentUser?.uid ?? null)) {
                return Promise.reject(error);
              }
              // fall through to redirect
            }
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

