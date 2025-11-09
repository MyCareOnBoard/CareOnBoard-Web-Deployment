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

// Onboarding API helpers

import type { UserProfile, UserProfileResponse } from '@/lib/api/users'

function getBase(): string {
  // Prefer existing env vars; fallback to relative (handled by dev proxy / hosting rewrites)
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  const prefix = (import.meta.env.VITE_API_PREFIX ?? '/api').replace(/\/$/, '')
  return `${base}${prefix}`
}

async function rawFetch<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${getBase()}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers || {}),
    },
    credentials: 'include',
    ...init,
  })
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const data = await res.json()
      if (data?.message) message = data.message
    } catch {
      const text = await res.text().catch(() => '')
      if (text) message = text
    }
    throw new Error(message)
  }
  if (res.status === 204) return undefined as unknown as T
  return res.json() as Promise<T>
}

// Marks the user as having completed onboarding
export async function completeOnboarding(): Promise<UserProfile> {
  const response = await rawFetch<UserProfileResponse>('/users/profile', {
    method: 'PUT',
    body: JSON.stringify({ onboardingCompleted: true }),
  })

  if (!response.success || !response.user) {
    throw new Error("Invalid response format from server")
  }

  return response.user
}
