import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { getIdToken } from '@/utils/auth';
import { auth } from '@/lib/firebase';
import {Routes} from "@/routes/constants";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const axiosClient: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const axiosClientWithoutAuth: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Wait for Firebase auth to initialize
 * This prevents race conditions on page refresh
 */
const waitForAuthInit = (): Promise<void> => {
    return new Promise((resolve) => {
        // If there's already a current user, auth is initialized
        if (auth.currentUser !== null) {
            resolve();
            return;
        }

        // Wait for auth state to be determined (max 5 seconds)
        const timeout = setTimeout(() => {
            unsubscribe();
            resolve();
        }, 5000);

        const unsubscribe = auth.onAuthStateChanged(() => {
            clearTimeout(timeout);
            unsubscribe();
            resolve();
        });
    });
};

axiosClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        // Wait for Firebase auth to initialize before getting token
        await waitForAuthInit();

        // Get Firebase ID token
        const token = await getIdToken();

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        const environment = import.meta.env.VITE_API_ENVIRONMENT || 'development';
        config.headers['x-environment'] = environment;

        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

axiosClient.interceptors.response.use(
    (response: AxiosResponse) => {
        return response;
    },
    async (error: AxiosError) => {
        if (error.response) {
            switch (error.response.status) {
                case 401:
                    if (window.location.pathname !== Routes.auth.login) {
                      window.location.href = Routes.auth.login;
                    }
                    break;
                case 403:
                    console.error('Access forbidden:', error.response.data);
                    break;
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

