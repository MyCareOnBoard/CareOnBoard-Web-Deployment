import { useEffect, useState, useCallback, ChangeEvent } from "react"
import { getAccountInfo, updateAccountInfo, AccountInfo, deleteAccount } from "@/lib/api/settings"
import { useForm } from "react-hook-form"
import { Form, FormField, FormItem, FormMessage, FormControl } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import SuccessModal from "./SuccessModal"
import { getAuth } from "firebase/auth"
import { Trash2, Loader2, User, AlertCircle } from "lucide-react"

interface AccountFormValues {
  fullName: string
  email: string
}

interface AccountTabProps {
  onSaved?: (info: AccountInfo) => void
}

export default function AccountTab({ onSaved }: AccountTabProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [info, setInfo] = useState<AccountInfo | null>(null)
  const [initialFullName, setInitialFullName] = useState("")
  const [initialImage, setInitialImage] = useState<string>("")
  const [selectedImage, setSelectedImage] = useState<string>("")
  const [tempImage, setTempImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [deleting, setDeleting] = useState(false)
  // Add modal title/message so we can reuse SuccessModal for delete
  const [modalTitle, setModalTitle] = useState<string>("Account Updated")
  const [modalMessage, setModalMessage] = useState<string>("Your account information has been successfully saved.")

  const form = useForm<AccountFormValues>({
    mode: "onChange",
    defaultValues: { fullName: "", email: "" },
  })

  const fullNameValue = form.watch("fullName")

  const load = useCallback(async () => {
    console.log("🔄 Loading account info...")
    setLoading(true)
    setError("")
    try {
      const data = await getAccountInfo()
      console.log("✅ Loaded account info:", data)

      let fullName = data.fullName || ""
      let email = data.email || ""
      const auth = getAuth()
      await auth.authStateReady?.()
      const current = auth.currentUser
      
      if (!fullName && current?.displayName) {
        console.log("⚠️ Using Firebase displayName as fallback:", current.displayName)
        fullName = current.displayName
      }
      if (!email && current?.email) {
        console.log("⚠️ Using Firebase email as fallback:", current.email)
        email = current.email
      }

      const merged: AccountInfo = {
        email,
        fullName,
        profilePicture: data.profilePicture,
      }

      console.log("✅ Merged account info:", merged)
      
      setInfo(merged)
      setInitialFullName(merged.fullName)
      setInitialImage(merged.profilePicture || "")
      
      form.reset(
        { fullName: merged.fullName, email: merged.email },
        { keepDefaultValues: false }
      )
      
      if (merged.profilePicture) {
        console.log("🖼️ Setting profile picture:", merged.profilePicture)
        setSelectedImage(merged.profilePicture)
      }
    } catch (e: any) {
      console.error("❌ Failed to load account info:", e)
      setError(e.message || "Failed to load account info")
    } finally {
      setLoading(false)
    }
  }, [form])

  useEffect(() => {
    load()
  }, [load])

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      console.log("🖼️ Image selected:", file.name, file.size, "bytes", file.type)
      if (file.size > 2 * 1024 * 1024) {
        setError("Image must be under 2MB")
        return
      }
      if (!file.type.startsWith("image/")) {
        setError("Only JPG and PNG images are supported")
        return
      }
      setError("")
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        const preview = reader.result as string
        console.log("🖼️ Preview generated")
        setTempImage(preview)
      }
      reader.readAsDataURL(file)
    }
  }

  const nameChanged = fullNameValue.trim() !== initialFullName.trim()
  const imageChanged = !!imageFile
  const hasChanges = nameChanged || imageChanged
  const hasProfilePicture = !!(tempImage || selectedImage || initialImage)

  const handleSave = async (data: AccountFormValues) => {
    console.log("💾 Save triggered")
    console.log("💾 Has changes:", hasChanges)
    console.log("💾 Name changed:", nameChanged)
    console.log("💾 Image changed:", imageChanged)
    console.log("💾 Has profile picture:", hasProfilePicture)
    
    // Validation: Profile picture is required
    if (!hasProfilePicture && !imageFile) {
      setError("Profile picture is required. Please upload an image.")
      return
    }
    
    if (!hasChanges) {
      setError("No changes to save")
      return
    }
    
    if (!data.fullName.trim()) {
      setError("Full name is required")
      return
    }

    setSaving(true)
    setError("")
    
    try {
      console.log("🚀 Calling updateAccountInfo...")
      console.log("📤 Sending fullName:", nameChanged ? data.fullName.trim() : "unchanged")
      console.log("📤 Sending image:", imageChanged ? imageFile!.name : "unchanged")
      
      const result = await updateAccountInfo({
        fullName: nameChanged ? data.fullName.trim() : undefined,
        profilePictureFile: imageChanged ? imageFile! : undefined,
      })

      console.log("✅ API Response:", result)
      console.log("✅ Response fullName:", result.fullName)
      console.log("✅ Response profilePicture:", result.profilePicture)

      // Create updated info - preserve existing values if API doesn't return them
      const updatedInfo: AccountInfo = {
        email: result.email || info?.email || data.email,
        fullName: result.fullName || data.fullName.trim(),
        profilePicture: result.profilePicture || selectedImage,
      }

      console.log("📝 Updated info object:", updatedInfo)

      // Update all state
      setInfo(updatedInfo)
      setInitialFullName(updatedInfo.fullName)
      setInitialImage(updatedInfo.profilePicture || "")
      
      // Update form values
      form.setValue("fullName", updatedInfo.fullName, { shouldValidate: false, shouldDirty: false })
      form.setValue("email", updatedInfo.email, { shouldValidate: false, shouldDirty: false })
      
      // Update displayed image
      if (result.profilePicture) {
        console.log("🖼️ Setting new profile picture from result:", result.profilePicture)
        setSelectedImage(result.profilePicture)
      } else if (tempImage && !result.profilePicture) {
        console.log("🖼️ Keeping temp preview as selected image")
        setSelectedImage(tempImage)
      }
      
      // Clear temp state
      setTempImage(null)
      setImageFile(null)

      console.log("✅ Save completed successfully")
      onSaved?.(updatedInfo)
      // Set modal content for save success
      setModalTitle("Account Updated")
      setModalMessage("Your account information has been successfully saved.")
      setIsModalVisible(true)
    } catch (e: any) {
      console.error("❌ Save failed:", e)
      setError(e.message || "Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  // Replace simulated delete with real API call
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete your account?")) return
    setError("")
    setDeleting(true)
    try {
      await deleteAccount()
      // Show success modal (you may redirect/sign out here if needed)
      setModalTitle("Account Deleted")
      setModalMessage("Your account has been permanently deleted.")
      setIsModalVisible(true)
    } catch (e: any) {
      setError(e?.message || "Failed to delete account")
    } finally {
      setDeleting(false)
    }
  }

  const handleCancel = () => {
    console.log("❌ Cancel clicked - resetting to initial values")
    setTempImage(null)
    setImageFile(null)
    setError("")
    
    if (info) {
      form.setValue("fullName", initialFullName, { shouldValidate: false, shouldDirty: false })
      form.setValue("email", info.email, { shouldValidate: false, shouldDirty: false })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white border rounded-lg">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#00b3ad]" />
          <p className="text-sm text-gray-500">Loading account information...</p>
        </div>
      </div>
    )
  }

  const displayImage = tempImage || selectedImage

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h4 className="text-[20px] font-bold text-[#10141a] leading-[1.3]">Account Info</h4>
        <p className="text-[#4f4f4f]">
          Manage your personal details and secure your login credentials.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 text-sm text-red-600 rounded-lg bg-red-50">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)}>
          {/* Profile Picture */}
          <div className="grid gap-6 py-4 border-t border-gray-200 sm:grid-cols-2">
            <div>
              <h2 className="font-semibold text-lg text-[#10141a]">
                Profile Picture <span className="text-red-500">*</span>
              </h2>
              <p className="text-sm text-[#4f4f4f]">
                Upload a photo so your team can recognize you.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {displayImage ? (
                <img
                  src={displayImage}
                  alt="Profile"
                  className="object-cover rounded-full w-14 h-14 ring-2 ring-offset-2 ring-gray-200"
                />
              ) : (
                <div className="flex items-center justify-center bg-gray-200 rounded-full w-14 h-14 ring-2 ring-offset-2 ring-red-300">
                  <User className="w-6 h-6 text-gray-500" />
                </div>
              )}
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <label className="bg-[#00b3ad] hover:bg-[#00a39f] text-white font-medium px-5 py-2 rounded-full transition cursor-pointer">
                  {saving ? "Uploading..." : displayImage ? "Change Image" : "Upload Image"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={saving}
                  />
                </label>
                {tempImage && (
                  <button
                    type="button"
                    onClick={() => {
                      console.log("🗑️ Clearing temp image")
                      setTempImage(null)
                      setImageFile(null)
                    }}
                    disabled={saving}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                )}
                <p className="text-sm text-[#4f4f4f]">
                  JPG/PNG, max 2MB {!hasProfilePicture && <span className="text-red-500">(Required)</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Full Name */}
          <div className="grid gap-6 py-4 border-t border-gray-200 sm:grid-cols-2">
            <div>
              <h2 className="font-semibold text-lg text-[#10141a]">
                Full Name <span className="text-red-500">*</span>
              </h2>
              <p className="text-sm text-[#4f4f4f]">
                This name will appear in your profile.
              </p>
            </div>

            <FormField
              control={form.control}
              name="fullName"
              rules={{ required: "Full name is required" }}
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <Input 
                      placeholder="Enter full name" 
                      {...field} 
                      disabled={saving}
                      className="bg-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Email */}
          <div className="grid gap-6 py-4 border-t border-gray-200 sm:grid-cols-2">
            <div>
              <h2 className="font-semibold text-lg text-[#10141a]">Email</h2>
              <p className="text-sm text-[#4f4f4f]">
                Used for login and receiving notifications.
              </p>
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <Input 
                      type="email" 
                      {...field} 
                      disabled 
                      readOnly
                      className="bg-gray-100 cursor-not-allowed"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Delete Account */}
          <div className="grid gap-6 pt-6 pb-6 border-t border-gray-200 sm:grid-cols-2">
            <div>
              <h2 className="font-semibold text-lg text-[#10141a]">Delete My Account</h2>
              <p className="text-sm text-[#4f4f4f]">Permanently delete the account.</p>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleDelete}
                variant="destructive"
                disabled={deleting}
                className="flex items-center gap-2 bg-[#d93c24] hover:bg-[#c52d16] rounded-full"
              >
                <Trash2 size={16} />
                {deleting ? "Deleting..." : "Delete Account"}
              </Button>
            </div>
          </div>

          {/* Save / Cancel Buttons */}
          <div className="flex flex-col justify-end gap-3 pt-6 border-t border-gray-200 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="border-[#00b3ad] text-[#00b3ad] hover:bg-[#00b3ad]/10 rounded-full"
              onClick={handleCancel}
              disabled={saving || !hasChanges}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              className="bg-[#00b3ad] text-white font-medium rounded-full hover:bg-[#00a39f] transition disabled:opacity-50"
              disabled={saving || !hasChanges}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* Success Modal */}
      <SuccessModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        title={modalTitle}
        message={modalMessage}
      />
    </div>
  )
}
