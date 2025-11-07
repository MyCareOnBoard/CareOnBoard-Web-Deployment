import { apiFetch } from "@/lib/api/otp"
import { auth, getFreshIdToken } from "@/lib/firebase"

export interface AccountInfo {
  email: string
  fullName: string
  profilePicture?: string
}

export interface NotificationSettings {
  emailNotifications: boolean
  inAppNotifications: boolean
  appointmentChanges: boolean
  systemWarnings: boolean
}

// helpers
function parseAccount(raw: any): AccountInfo {
  console.log("🔍 parseAccount raw:", JSON.stringify(raw, null, 2))
  const u =
    raw?.user ??
    raw?.account ??
    raw?.data?.user ??
    raw?.data ??
    raw ??
    {}

  const fullName =
    u.fullName ??
    u.full_name ??
    u.name ??
    u.full_Name ??
    u.FullName ??
    (u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.firstName) ??
    u.displayName ??
    ""

  const profilePicture = 
    u.profilePicture ?? 
    u.profile_picture ??
    u.photoURL ?? 
    u.avatar ?? 
    u.profile_image ?? 
    u.profilePictureUrl ??
    u.picture ??
    ""

  const result = {
    email: u.email ?? "",
    fullName: fullName ?? "",
    profilePicture: profilePicture ?? "",
  }
  
  console.log("✅ parseAccount result:", result)
  return result
}

async function getAuthToken(): Promise<string | undefined> {
  try {
    const t = await getFreshIdToken(true)
    if (t) return t
    if (auth.currentUser) return auth.currentUser.getIdToken(true)
  } catch (e) {
    console.error("Failed to get auth token:", e)
  }
  return undefined
}

function buildApiBase(): string {
  const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "")
  const basePath = (import.meta.env.VITE_API_BASE_PATH || "").replace(/^\/+|\/+$/g, "")
  if (!base) throw new Error("VITE_API_BASE_URL not configured")
  return basePath ? `${base}/${basePath}` : base
}

// Account info
export async function getAccountInfo(): Promise<AccountInfo> {
  console.log("📡 GET /userProfile/account-info")
  let res = await apiFetch("/userProfile/account-info")
  console.log("📥 GET Response:", JSON.stringify(res, null, 2))
  
  // If backend returns empty, try alternative endpoints
  if (!res || (!res.email && !res.fullName && !res.user?.email)) {
    console.warn("⚠️ /userProfile/account-info returned empty, trying /users/profile...")
    try {
      res = await apiFetch("/users/profile")
      console.log("📥 GET /users/profile Response:", JSON.stringify(res, null, 2))
    } catch (e) {
      console.warn("⚠️ /users/profile also failed:", e)
    }
  }
  
  return parseAccount(res)
}

export async function updateFullName(fullName: string): Promise<void> {
  console.log("📡 PUT /userProfile/account-info with fullName:", fullName)
  
  // Try primary endpoint
  try {
    const res = await apiFetch("/userProfile/account-info", {
      method: "PUT",
      body: JSON.stringify({ fullName }),
    })
    console.log("📥 PUT /userProfile/account-info response:", JSON.stringify(res, null, 2))
  } catch (e: any) {
    console.warn("⚠️ PUT /userProfile/account-info failed, trying /users/profile...", e)
    
    // Fallback to alternative endpoint
    const res = await apiFetch("/users/profile", {
      method: "PUT",
      body: JSON.stringify({ fullName }),
    })
    console.log("📥 PUT /users/profile response:", JSON.stringify(res, null, 2))
  }
}

export async function updateProfilePicture(profilePicture: string): Promise<void> {
  console.log("📡 PUT /userProfile/account-info with profilePicture:", profilePicture)
  
  try {
    const res = await apiFetch("/userProfile/account-info", {
      method: "PUT",
      body: JSON.stringify({ profilePicture }),
    })
    console.log("📥 PUT /userProfile/account-info (picture) response:", JSON.stringify(res, null, 2))
  } catch (e: any) {
    console.warn("⚠️ PUT /userProfile/account-info failed, trying /users/profile...", e)
    
    const res = await apiFetch("/users/profile", {
      method: "PUT",
      body: JSON.stringify({ profilePicture }),
    })
    console.log("📥 PUT /users/profile (picture) response:", JSON.stringify(res, null, 2))
  }
}

// Profile picture upload (multipart) -> returns data.url per provided schema
export async function uploadProfilePicture(file: File): Promise<string> {
  console.log("📡 POST /profilePictureUpload with file:", file.name, file.size, "bytes")
  const token = await getAuthToken()
  const form = new FormData()
  form.append("file", file, file.name)

  const url = `${buildApiBase()}/profilePictureUpload`
  console.log("🔗 Upload URL:", url)

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  })

  let json: any = null
  try {
    const text = await resp.text()
    console.log("📥 Upload response text:", text)
    json = text ? JSON.parse(text) : null
  } catch (e) {
    console.error("❌ Failed to parse upload response:", e)
  }

  if (!resp.ok) {
    const msg = json?.message || json?.error || `Upload failed (${resp.status})`
    console.error("❌ Upload error:", msg, "Status:", resp.status)
    throw new Error(msg)
  }

  console.log("✅ Upload response JSON:", JSON.stringify(json, null, 2))

  // Match the provided schema: json.data.url
  const uploadedUrl =
    json?.data?.url ||
    json?.url ||
    json?.data?.profilePicture ||
    json?.data?.profilePictureUrl ||
    ""

  console.log("🖼️ Extracted URL:", uploadedUrl)

  if (!uploadedUrl) {
    console.error("❌ No URL in upload response")
    throw new Error("Upload succeeded but no URL returned")
  }
  
  return uploadedUrl
}

// Combined convenience - Upload image AND update full name
export async function updateAccountInfo(opts: { fullName?: string; profilePictureFile?: File }): Promise<AccountInfo> {
  let uploadedUrl: string | undefined
  
  if (opts.profilePictureFile) {
    // This should auto-update the user's profilePicture field
    uploadedUrl = await uploadProfilePicture(opts.profilePictureFile)
  }
  
  if (opts.fullName) {
    await updateFullName(opts.fullName.trim())
  }
  
  // Single GET to verify - should return fresh data
  return await getAccountInfo()
}

// Notifications (unchanged)
export async function getNotificationSettings(): Promise<NotificationSettings> {
  const res = await apiFetch("/userProfile/notifications")
  const n = res?.notifications || res || {}
  return {
    emailNotifications: !!n.emailNotifications,
    inAppNotifications: !!n.inAppNotifications,
    appointmentChanges: !!n.appointmentChanges,
    systemWarnings: !!n.systemWarnings,
  }
}

export async function updateNotificationSettings(prefs: NotificationSettings): Promise<NotificationSettings> {
  await apiFetch("/userProfile/notifications", {
    method: "PUT",
    body: JSON.stringify(prefs),
  })
  return getNotificationSettings()
}

export async function deleteAccount(): Promise<void> {
  // apiFetch should already handle base URL, headers, and auth
  await apiFetch("/userProfile/account", { method: "DELETE" })
}