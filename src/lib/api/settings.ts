import axiosClient from '../axios';

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

// Account info
export async function getAccountInfo(): Promise<AccountInfo> {
  console.log("📡 GET /userProfile/account-info")
  let response = await axiosClient.get("/userProfile/account-info")
  let res = response.data
  console.log("📥 GET Response:", JSON.stringify(res, null, 2))

  // If backend returns empty, try alternative endpoints
  if (!res || (!res.email && !res.fullName && !res.user?.email)) {
    console.warn("⚠️ /userProfile/account-info returned empty, trying /users/profile...")
    try {
      response = await axiosClient.get("/users/profile")
      res = response.data
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
    const response = await axiosClient.put("/userProfile/account-info", { fullName })
    console.log("📥 PUT /userProfile/account-info response:", JSON.stringify(response.data, null, 2))
  } catch (e: any) {
    console.warn("⚠️ PUT /userProfile/account-info failed, trying /users/profile...", e)

    // Fallback to alternative endpoint
    const response = await axiosClient.put("/users/profile", { fullName })
    console.log("📥 PUT /users/profile response:", JSON.stringify(response.data, null, 2))
  }
}

export async function updateProfilePicture(profilePicture: string): Promise<void> {
  console.log("📡 PUT /userProfile/account-info with profilePicture:", profilePicture)

  try {
    const response = await axiosClient.put("/userProfile/account-info", { profilePicture })
    console.log("📥 PUT /userProfile/account-info (picture) response:", JSON.stringify(response.data, null, 2))
  } catch (e: any) {
    console.warn("⚠️ PUT /userProfile/account-info failed, trying /users/profile...", e)

    const response = await axiosClient.put("/users/profile", { profilePicture })
    console.log("📥 PUT /users/profile (picture) response:", JSON.stringify(response.data, null, 2))
  }
}

// Profile picture upload (multipart) -> returns data.url per provided schema
export async function uploadProfilePicture(file: File): Promise<string> {
  console.log("📡 POST /profilePictureUpload with file:", file.name, file.size, "bytes")

  const formData = new FormData()
  formData.append("file", file, file.name)

  try {
    const response = await axiosClient.post("/profilePictureUpload", formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    console.log("✅ Upload response JSON:", JSON.stringify(response.data, null, 2))

    // Match the provided schema: json.data.url
    const uploadedUrl =
      response.data?.data?.url ||
      response.data?.url ||
      response.data?.data?.profilePicture ||
      response.data?.data?.profilePictureUrl ||
      ""

    console.log("🖼️ Extracted URL:", uploadedUrl)

    if (!uploadedUrl) {
      console.error("❌ No URL in upload response")
      throw new Error("Upload succeeded but no URL returned")
    }

    return uploadedUrl
  } catch (error: any) {
    console.error("❌ Upload error:", error)
    throw new Error(error.response?.data?.message || error.message || "Failed to upload profile picture")
  }
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

// Notifications
export async function getNotificationSettings(): Promise<NotificationSettings> {
  const response = await axiosClient.get("/userProfile/notifications")
  const res = response.data
  const n = res?.notifications || res || {}
  return {
    emailNotifications: !!n.emailNotifications,
    inAppNotifications: !!n.inAppNotifications,
    appointmentChanges: !!n.appointmentChanges,
    systemWarnings: !!n.systemWarnings,
  }
}

export async function updateNotificationSettings(prefs: NotificationSettings): Promise<NotificationSettings> {
  await axiosClient.put("/userProfile/notifications", prefs)
  return getNotificationSettings()
}

export async function deleteAccount(): Promise<void> {
  await axiosClient.delete("/userProfile/account")
}