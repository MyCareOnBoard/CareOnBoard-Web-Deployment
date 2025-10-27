import { auth } from './firebase';

// Backend API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  
  if (!user) {
    console.warn('No authenticated user found');
    return null;
  }

  try {
    // Get fresh ID token (automatically refreshes if expired)
    const token = await user.getIdToken();
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  /**
   * GET request
   */
  get: async <T = any>(endpoint: string): Promise<T> => {
    return apiRequest<T>(endpoint, { method: 'GET' });
  },

  /**
   * POST request
   */
  post: async <T = any>(endpoint: string, data?: any): Promise<T> => {
    return apiRequest<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * PUT request
   */
  put: async <T = any>(endpoint: string, data?: any): Promise<T> => {
    return apiRequest<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * PATCH request
   */
  patch: async <T = any>(endpoint: string, data?: any): Promise<T> => {
    return apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * DELETE request
   */
  delete: async <T = any>(endpoint: string): Promise<T> => {
    return apiRequest<T>(endpoint, { method: 'DELETE' });
  },
};

/**
 * Example: Upload file with authentication
 */
export async function uploadFile(
  endpoint: string,
  file: File,
  additionalData?: Record<string, string>
): Promise<any> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const formData = new FormData();
  formData.append('file', file);
  
  // Add any additional fields
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // Don't set Content-Type for FormData - browser sets it with boundary
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Upload failed: ${response.status}`);
  }

  return await response.json();
}
