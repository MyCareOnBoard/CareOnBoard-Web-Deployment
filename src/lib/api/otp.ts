import { auth, getFreshIdToken } from "@/lib/firebase"
import { getAuth } from 'firebase/auth'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

console.log('🔧 [API] Base URL configured as:', API_BASE_URL)

const stripTrailing = (s: string) => s.replace(/\/+$/, "")
const trimSlashes = (s: string) => s.replace(/^\/+|\/+$/g, "")

const BASE_URL = (() => {
  const url = import.meta.env.VITE_API_BASE_URL as string | undefined
  if (!url) {
    console.error("❌ VITE_API_BASE_URL is missing in .env file")
    throw new Error("VITE_API_BASE_URL is missing in .env.")
  }
  const cleaned = stripTrailing(url)
  console.log("🔗 API Base URL:", cleaned)
  return cleaned
})()

const BASE_PATH = (() => {
  const p = import.meta.env.VITE_API_BASE_PATH || ""
  return p ? `/${trimSlashes(p)}` : ""
})()

async function waitForAuthReady() {
  if (auth.currentUser) return
  await new Promise<void>((resolve) => {
    const unsub = auth.onAuthStateChanged(() => {
      unsub()
      resolve()
    })
    setTimeout(() => {
      unsub()
      resolve()
    }, 5000)
  })
}

/**
 * Get current user's ID token for API authentication
 */
async function getIdToken(): Promise<string> {
  const auth = getAuth()
  const user = auth.currentUser

  if (!user) {
    throw new Error('No authenticated user found')
  }

  try {
    const token = await user.getIdToken()
    console.log('🔑 [API] Got ID token for user:', user.uid)
    return token
  } catch (error) {
    console.error('❌ [API] Failed to get ID token:', error)
    throw new Error('Failed to get authentication token')
  }
}

/**
 * Generic API fetch wrapper with authentication
 */
export async function apiFetch(
  endpoint: string,
  options: RequestInit & { headers?: HeadersInit | undefined } = {}
): Promise<any> {
  try {
    const idToken = await getIdToken()
    
    // Check if body is FormData
    const isFormData = options.body instanceof FormData
    
    const headers: HeadersInit = {
      Authorization: `Bearer ${idToken}`,
      // Only set Content-Type if not FormData (browser sets it automatically with boundary)
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    }

    // Remove undefined headers
    if (options.headers === undefined) {
      delete (headers as any)['Content-Type']
    }

    const url = `${API_BASE_URL}${endpoint}`
    
    console.log(`🌐 [API] ${options.method || 'GET'} ${url}`)
    if (isFormData) {
      console.log('📦 [API] Sending FormData')
    } else if (options.body) {
      console.log('📦 [API] Request body:', options.body)
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    console.log(`📡 [API] Response status: ${response.status} ${response.statusText}`)

    // Handle 404 specifically
    if (response.status === 404) {
      throw new Error(`Endpoint not found: ${endpoint}`)
    }

    const responseText = await response.text()
    console.log('📥 [API] Response text:', responseText.substring(0, 200))

    let data
    try {
      data = responseText ? JSON.parse(responseText) : {}
    } catch (e) {
      console.error('❌ [API] Failed to parse JSON response')
      throw new Error('Invalid JSON response from server')
    }

    if (!response.ok) {
      console.error('❌ [API] Error response:', data)
      throw new Error(data.message || `HTTP error! status: ${response.status}`)
    }

    return data
  } catch (error: any) {
    // Enhance error messages
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      console.error('❌ [API] Network error - Unable to reach server')
      console.error('❌ [API] Attempted URL:', `${API_BASE_URL}${endpoint}`)
      throw new Error('Network error: Unable to reach the server. Please check your connection and API configuration.')
    }
    throw error
  }
}

/**
 * Send OTP to user's email
 */
export async function sendOtp(email: string): Promise<{ success: boolean; message: string }> {
  console.log('📧 [OTP] Sending OTP to:', email)
  
  const response = await apiFetch('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })

  console.log('✅ [OTP] Send response:', response)
  return response
}

/**
 * Verify OTP code
 */
export async function verifyOtp(
  email: string,
  code: string
): Promise<{ success: boolean; message: string }> {
  console.log('🔐 [OTP] Verifying OTP for:', email)
  
  const response = await apiFetch('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  })

  console.log('✅ [OTP] Verify response:', response)
  return response
}

/**
 * Check if user has verified OTP
 */
export async function checkOtpStatus(): Promise<{
  otpVerified: boolean
  otpVerifiedAt?: string
}> {
  console.log('🔍 [OTP] Checking OTP status...')
  
  try {
    const response = await apiFetch('/auth/otp-status', {
      method: 'GET',
    })

    console.log('✅ [OTP] Status response:', response)
    
    return {
      otpVerified: response.otpVerified || false,
      otpVerifiedAt: response.otpVerifiedAt,
    }
  } catch (error: any) {
    console.error('❌ [OTP] Failed to check status:', error)
    
    // Return false on error instead of throwing
    return {
      otpVerified: false,
    }
  }
}
