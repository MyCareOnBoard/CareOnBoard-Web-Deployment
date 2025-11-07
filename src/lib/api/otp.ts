import { auth, getFreshIdToken } from "@/lib/firebase"

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

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  await waitForAuthReady()
  const token = await getFreshIdToken(true)

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers && !(options.headers instanceof Headers)
      ? (options.headers as Record<string, string>)
      : {}),
  }

  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
  const url = `${BASE_URL}${BASE_PATH}${path}`

  console.log(`📡 Fetching: ${options.method || 'GET'} ${url}`)

  let response: Response
  try {
    response = await fetch(url, { 
      ...options, 
      headers,
      mode: 'cors', // Explicitly set CORS mode
    })
  } catch (e: any) {
    console.error(`❌ Network error for ${url}:`, e)
    throw new Error(`Network error: Unable to reach the server. Please check your connection and API configuration.`)
  }

  const text = await response.text()
  let data: any
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { message: text || "Invalid response from server" }
  }

  if (!response.ok) {
    console.error(`❌ API Error ${response.status}:`, data)
    
    if (response.status === 401) {
      localStorage.removeItem("authToken")
      window.location.href = "/login"
      return
    }
    
    if (response.status === 404) {
      throw new Error(`Endpoint not found: ${path}`)
    }
    
    throw new Error(data?.message || data?.error || `API Error: ${response.status}`)
  }

  console.log(`✅ Success: ${url}`, data)
  return data
}

// Internal helper to try multiple endpoints
async function apiFetchWithFallback(endpoints: string[], options?: RequestInit) {
  let lastErr: any
  console.log(`🔄 Trying ${endpoints.length} endpoints:`, endpoints)
  
  for (const ep of endpoints) {
    try {
      const result = await apiFetch(ep, options)
      console.log(`✅ Success with endpoint: ${ep}`)
      return result
    } catch (e: any) {
      const msg = e?.message || ""
      console.warn(`⚠️ Failed: ${ep} - ${msg}`)
      
      // Only continue on 404 errors, throw others immediately
      if (/404/.test(msg) || /not found/i.test(msg) || /endpoint not found/i.test(msg)) {
        lastErr = e
        continue
      }
      
      // For network errors, don't try other endpoints
      if (/network error/i.test(msg)) {
        throw e
      }
      
      throw e
    }
  }
  
  console.error("❌ All endpoints failed")
  throw lastErr || new Error("All API endpoints are unavailable. Please contact support.")
}

export async function sendOtp(email: string) {
  const body = { email }
  return apiFetchWithFallback(
    ["/otp/send", "/api/otp/send", "/auth/otp/send"],
    { method: "POST", body: JSON.stringify(body) }
  )
}

export async function verifyOtp(email: string, otp: string) {
  const body = { email, otp }
  return apiFetchWithFallback(
    ["/otp/verify", "/api/otp/verify", "/auth/otp/verify"],
    { method: "POST", body: JSON.stringify(body) }
  )
}

export async function resendOtp(email: string) {
  const body = { email }
  return apiFetchWithFallback(
    ["/otp/resend", "/api/otp/resend", "/auth/otp/resend"],
    { method: "POST", body: JSON.stringify(body) }
  )
}

export async function getOtpStatus(email: string) {
  return apiFetchWithFallback(
    [`/otp/status?email=${encodeURIComponent(email)}`, `/api/otp/status?email=${encodeURIComponent(email)}`],
    { method: "GET" }
  )
}
