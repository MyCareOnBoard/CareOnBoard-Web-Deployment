/**
 * Centralized API fetch wrapper
 * Handles base URL, headers, auth, and error responses
 */

function getApiUrl(path: string): string {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  
  // Remove leading slash from path if present
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  
  return `${base}${cleanPath}`
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = getApiUrl(path)
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Include cookies for session auth
  }

  try {
    const response = await fetch(url, config)

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T
    }

    // Parse response body
    let data: any
    const contentType = response.headers.get('content-type')
    
    if (contentType?.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    // Handle non-OK responses
    if (!response.ok) {
      const message = 
        data?.message || 
        data?.error || 
        (typeof data === 'string' ? data : '') ||
        `Request failed with status ${response.status}`
      
      throw new Error(message)
    }

    return data as T
  } catch (error) {
    // Network errors or fetch failures
    if (error instanceof Error) {
      throw error
    }
    throw new Error('An unexpected error occurred')
  }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const apiClient = {
  get: <T = any>(path: string, options?: RequestInit) =>
    apiFetch<T>(path, { ...options, method: 'GET' }),
  
  post: <T = any>(path: string, body?: any, options?: RequestInit) =>
    apiFetch<T>(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  
  put: <T = any>(path: string, body?: any, options?: RequestInit) =>
    apiFetch<T>(path, { 
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  
  patch: <T = any>(path: string, body?: any, options?: RequestInit) =>
    apiFetch<T>(path, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
  
  delete: <T = any>(path: string, options?: RequestInit) =>
    apiFetch<T>(path, { ...options, method: 'DELETE' }),
}