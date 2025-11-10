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

  return {
    email: u.email ?? "",
    fullName: fullName ?? "",
    profilePicture: profilePicture ?? "",
  }
}

// Account info
export async function getAccountInfo(): Promise<AccountInfo> {
  try {
    const primaryResponse = await axiosClient.get("/userProfile/account-info")
    let responseData = primaryResponse.data

    if (!responseData || (!responseData.email && !responseData.fullName && !responseData?.user?.email)) {
      const fallbackResponse = await axiosClient.get("/users/profile")
      responseData = fallbackResponse.data
    }

    return parseAccount(responseData)
  } catch (error) {
    console.error("Failed to fetch account info:", error)
    throw error
  }
}

export async function updateFullName(fullName: string): Promise<void> {
  try {
    await axiosClient.put("/userProfile/account-info", { fullName })
  } catch (primaryError) {
    console.error("Failed to update full name via /userProfile/account-info:", primaryError)
    try {
      await axiosClient.put("/users/profile", { fullName })
    } catch (fallbackError) {
      console.error("Failed to update full name via fallback endpoint:", fallbackError)
      throw fallbackError
    }
  }
}

export async function updateProfilePicture(profilePicture: string): Promise<void> {
  try {
    await axiosClient.put("/userProfile/account-info", { profilePicture })
  } catch (primaryError) {
    console.error("Failed to update profile picture via /userProfile/account-info:", primaryError)
    try {
      await axiosClient.put("/users/profile", { profilePicture })
    } catch (fallbackError) {
      console.error("Failed to update profile picture via fallback endpoint:", fallbackError)
      throw fallbackError
    }
  }
}

// Profile picture upload (multipart) -> returns data.url per provided schema
export async function uploadProfilePicture(file: File): Promise<string> {
  try {
    const formData = new FormData()
    formData.append("file", file)

    const response = await axiosClient.post("/profilePictureUpload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })

    const data = response.data
    const uploadedUrl =
      data?.data?.url ??
      data?.url ??
      data?.data?.profilePicture ??
      data?.data?.profilePictureUrl ??
      ""

    if (!uploadedUrl) {
      throw new Error("Upload succeeded but no URL returned")
    }

    return uploadedUrl
  } catch (error) {
    console.error("Failed to upload profile picture:", error)
    throw error
  }
}

// Combined convenience - Upload image AND update full name
export async function updateAccountInfo(opts: { fullName?: string; profilePictureFile?: File }): Promise<AccountInfo> {
  try {
    if (opts.profilePictureFile) {
      await uploadProfilePicture(opts.profilePictureFile)
    }

    if (opts.fullName) {
      await updateFullName(opts.fullName.trim())
    }

    return await getAccountInfo()
  } catch (error) {
    console.error("Failed to update account info:", error)
    throw error
  }
}

// Notifications (unchanged)
export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const response = await axiosClient.get("/userProfile/notifications")
    const res = response.data
    const n = res?.notifications || res || {}
    return {
      emailNotifications: !!n.emailNotifications,
      inAppNotifications: !!n.inAppNotifications,
      appointmentChanges: !!n.appointmentChanges,
      systemWarnings: !!n.systemWarnings,
    }
  } catch (error) {
    console.error("Failed to fetch notification settings:", error)
    throw error
  }
}

export async function updateNotificationSettings(prefs: NotificationSettings): Promise<NotificationSettings> {
  try {
    await axiosClient.put("/userProfile/notifications", prefs)
    return await getNotificationSettings()
  } catch (error) {
    console.error("Failed to update notification settings:", error)
    throw error
  }
}

export async function deleteAccount(): Promise<void> {
  try {
    await axiosClient.delete("/userProfile/account")
  } catch (error) {
    console.error("Failed to delete account:", error)
    throw error
  }
}