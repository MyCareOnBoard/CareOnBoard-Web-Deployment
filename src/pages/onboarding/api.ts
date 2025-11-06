// src/lib/api.ts
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api"

// Helper for common request logic
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem("authToken")

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  // Try to parse JSON response safely
  let data
  try {
    data = await response.json()
  } catch {
    data = {}
  }

  if (!response.ok) {
    throw new Error(data.message || "API request failed")
  }

  return data
}
