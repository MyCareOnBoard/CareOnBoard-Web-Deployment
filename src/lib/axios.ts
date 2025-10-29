import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { getIdToken } from '@/utils/auth';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const axiosClient: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

axiosClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
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
                    // Token expired or invalid - redirect to login
                    window.location.href = '/login';
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

